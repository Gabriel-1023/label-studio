import { when } from "mobx";
import { inject, observer } from "mobx-react";
import { type FC, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  IconAnnotationAccepted,
  IconAnnotationImported,
  IconAnnotationPrediction,
  IconAnnotationPropagated,
  IconAnnotationRejected,
  IconAnnotationReviewRemoved,
  IconAnnotationSkipped,
  IconAnnotationSubmitted,
  IconCheck,
  IconDraftCreated,
  IconSparks,
  IconHistoryRewind,
} from "@humansignal/icons";
import { Tooltip, Userpic } from "@humansignal/ui";
import { Space } from "../../common/Space/Space";
import { Block, cn, Elem } from "../../utils/bem";
import { humanDateDiff, userDisplayName } from "../../utils/utilities";
import { EmptyState } from "../SidePanels/Components/EmptyState";
import "./AnnotationHistory.scss";

type HistoryItemType =
  | "prediction"
  | "imported"
  | "submitted"
  | "updated"
  | "skipped"
  | "accepted"
  | "rejected"
  | "fixed_and_accepted"
  | "draft_created"
  | "deleted_review"
  | "propagated_annotation";

const injector = inject(({ store }) => {
  const as = store.annotationStore;
  const selected = as?.selected;

  return {
    annotationStore: as,
    selected: as?.selected,
    createdBy: selected?.user ?? { email: selected?.createdBy },
    createdDate: selected?.createdDate,
    history: as?.history,
    selectedHistory: as?.selectedHistory,
  };
});

const DraftState: FC<{
  annotation: any;
  inline?: boolean;
  isSelected?: boolean;
}> = observer(({ annotation, inline, isSelected }: { annotation: any; inline?: boolean; isSelected?: boolean }) => {
  const hasChanges = annotation.history.hasChanges;
  const store = annotation.list; // @todo weird name
  const infoIsHidden = store.store.hasInterface("annotations:hide-info");
  const hiddenUser = infoIsHidden ? { email: "Me" } : null;

  const [hasUnsavedChanges, setChanges] = useState(false);

  // turn it on when changes just made; off when they we saved
  useEffect(() => {
    setChanges(true);
  }, [annotation.history.history.length]);
  useEffect(() => {
    setChanges(false);
  }, [annotation.draftSaved]);

  if (!hasChanges && !annotation.versions.draft) return null;

  return (
    <HistoryItem
      key="draft"
      user={hiddenUser ?? annotation.user ?? { email: annotation.createdBy }}
      date={annotation.draftSaved}
      extra={
        annotation.isDraftSaving ? (
          <Elem name="saving">
            <Elem name="spin" />
          </Elem>
        ) : hasUnsavedChanges ? (
          <Elem name="saving">
            <Elem name="dot" />
          </Elem>
        ) : hasChanges ? (
          <Elem name="saving">
            <Elem name="saved" component={IconCheck} />
          </Elem>
        ) : null
      }
      inline={inline}
      comment=""
      acceptedState="draft_created"
      selected={isSelected}
      hideInfo={infoIsHidden}
      onClick={() => {
        store.selectHistory(null);
        annotation.toggleDraft(true);
      }}
    />
  );
});

const AnnotationHistoryComponent: FC<any> = ({
  annotationStore,
  selectedHistory,
  history,
  enabled = true,
  inline = false,
  showEmptyState = true,
  sectionHeader,
  renderEmptyState,
}) => {
  const annotation = annotationStore.selected;
  const lastItem = history?.length ? history[0] : null;
  const hasChanges = annotation.history.hasChanges;
  const infoIsHidden = annotationStore.store.hasInterface("annotations:hide-info");
  const currentUser = window.APP_SETTINGS?.user;

  // if user makes changes at the first time there are no draft yet
  const isDraftSelected =
    !annotationStore.selectedHistory && (annotation.draftSelected || (!annotation.versions.draft && hasChanges));

  // Determine if the empty state should be shown
  const hasDraft = annotation?.versions?.draft;
  const hasHistory = history && history.length > 0;
  const shouldShowEmptyState = showEmptyState && !hasChanges && !hasDraft && !hasHistory;

  // Default empty state component
  const defaultEmptyState = (
    <EmptyState
      icon={<IconHistoryRewind width={24} height={24} />}
      header="View annotation activity"
      description={<>See a log of user actions for this annotation</>}
    />
  );

  // If we should show empty state, render it
  if (shouldShowEmptyState) {
    return (
      <Block name="annotation-history" mod={{ inline, empty: true }}>
        {sectionHeader && (
          <div
            className={`${cn("annotation-history").elem("section-head").toString()}${showEmptyState ? " sr-only" : ""}`}
          >
            {sectionHeader}
          </div>
        )}
        {renderEmptyState ? renderEmptyState() : defaultEmptyState}
      </Block>
    );
  }

  return (
    <Block name="annotation-history" mod={{ inline }}>
      {sectionHeader && <Elem name="section-head">{sectionHeader}</Elem>}
      <DraftState annotation={annotation} isSelected={isDraftSelected} inline={inline} />
      {enabled &&
        history.length > 0 &&
        history.map((item: any) => {
          const { id, user, createdDate } = item;
          const isLastItem = lastItem?.id === item.id;
          const isSelected = isLastItem && !selectedHistory ? !isDraftSelected : selectedHistory?.id === item.id;
          const hiddenUser = infoIsHidden ? { email: currentUser?.id === user.id ? "Me" : "User" } : null;

          return (
            <HistoryItem
              key={id}
              inline={inline}
              user={hiddenUser ?? user ?? { email: item?.createdBy }}
              date={createdDate}
              comment={item.comment}
              acceptedState={item.actionType}
              selected={isSelected}
              disabled={item.results.length === 0}
              hideInfo={infoIsHidden}
              onClick={async () => {
                if (hasChanges) {
                  annotation.saveDraftImmediately();
                  // wait for draft to be saved before switching to history
                  await when(() => !annotation.isDraftSaving);
                }
                if (isLastItem || isSelected) {
                  // last history state and draft are actual annotation, not from history
                  // and if user clicks on already selected item we should switch to last state
                  annotationStore.selectHistory(null);
                  // if user clicks on last history state we should disable draft to see submitted state
                  annotation.toggleDraft(isSelected);
                } else {
                  annotationStore.selectHistory(item);
                }
              }}
            />
          );
        })}
    </Block>
  );
};

const HistoryItemComponent: FC<{
  entity?: any;
  user: any;
  date: string | number;
  extra?: any;
  comment: string;
  acceptedState: HistoryItemType;
  selected?: boolean;
  disabled?: boolean;
  inline?: boolean;
  hideInfo?: boolean;
  onClick: any;
}> = ({
  entity,
  user,
  date,
  extra,
  comment,
  acceptedState,
  selected = false,
  disabled = false,
  inline = false,
  hideInfo: infoIsHidden,
  onClick,
}) => {
  const isPrediction = entity?.type === "prediction";

  const reason = useMemo(() => {
    switch (acceptedState) {
      case "accepted":
        return "Accepted";
      case "rejected":
        return "Rejected";
      case "fixed_and_accepted":
        return "Fixed";
      case "updated":
        return "Updated";
      case "submitted":
        return "Submitted";
      case "prediction":
        return "From prediction";
      case "imported":
        return "Imported";
      case "skipped":
        return "Skipped";
      case "draft_created":
        return "Draft";
      case "deleted_review":
        return "Review deleted";
      case "propagated_annotation":
        return "Propagated";
      default:
        return null;
    }
  }, []);

  const handleClick = useCallback(
    (e) => {
      if (disabled) return;

      onClick(e);
    },
    [onClick, disabled],
  );

  return (
    <Block name="history-item" mod={{ inline, selected, disabled }} onClick={handleClick}>
      <Space spread size="medium" truncated>
        <Space size="small" truncated>
          <Elem
            tag={Userpic}
            user={user}
            name="userpic"
            showUsername
            username={isPrediction ? entity.createdBy : null}
            mod={{ prediction: isPrediction }}
          >
            {isPrediction && <IconSparks style={{ width: 16, height: 16 }} />}
          </Elem>
          <Elem name="name" tag="span">
            {isPrediction ? entity.createdBy : userDisplayName(user)}
          </Elem>
        </Space>

        {!infoIsHidden && (
          <Space size="small">
            {extra && <Elem name="date">{extra}</Elem>}
            {date && (
              <Elem name="date">
                <Tooltip alignment="top-right" title={new Date(date).toLocaleString()}>
                  <span>{humanDateDiff(date)}</span>
                </Tooltip>
              </Elem>
            )}
          </Space>
        )}
      </Space>
      {(reason || comment) && (
        <Elem name="action" tag={Space} size="small">
          {acceptedState && <HistoryIcon type={acceptedState} />}
          <HistoryComment comment={comment} reason={reason} />
        </Elem>
      )}
    </Block>
  );
};

const HistoryComment: FC<{
  reason: string | null;
  comment: string;
}> = ({ reason, comment }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsible, setCollapsible] = useState(false);
  const commentRef = useRef();

  useLayoutEffect(() => {
    if (commentRef.current) {
      const { clientHeight } = commentRef.current;
      // 3 lines of text 22px height each
      const heightExceeded = clientHeight > 66;

      setCollapsible(heightExceeded);
      setCollapsed(heightExceeded);
    }
  }, []);

  return (
    <Elem name="comment" ref={commentRef} mod={{ collapsed }}>
      <Elem name="comment-content" data-reason={`${reason}${comment ? ": " : ""}`}>
        {comment}
      </Elem>

      {collapsible && (
        <Elem
          name="collapse-comment"
          mod={{ collapsed }}
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            setCollapsed((v) => !v);
          }}
        >
          {collapsed ? "Show more" : "Show less"}
        </Elem>
      )}
    </Elem>
  );
};

const HistoryIcon: FC<{ type: HistoryItemType }> = ({ type }) => {
  const icon = useMemo(() => {
    switch (type) {
      case "submitted":
        return <IconAnnotationSubmitted style={{ color: "#617ADA" }} />;
      case "updated":
        return <IconAnnotationSubmitted style={{ color: "#617ADA" }} />;
      case "draft_created":
        return <IconDraftCreated style={{ color: "#617ADA" }} />;
      case "accepted":
        return <IconAnnotationAccepted style={{ color: "#2AA000" }} />;
      case "rejected":
        return <IconAnnotationRejected style={{ color: "#dd0000" }} />;
      case "fixed_and_accepted":
        return <IconAnnotationAccepted style={{ color: "#FA8C16" }} />;
      case "prediction":
        return <IconAnnotationPrediction style={{ color: "#944BFF" }} />;
      case "imported":
        return <IconAnnotationImported style={{ color: "#2AA000" }} />;
      case "skipped":
        return <IconAnnotationSkipped style={{ color: "#dd0000" }} />;
      case "deleted_review":
        return <IconAnnotationReviewRemoved style={{ color: "#dd0000" }} />;
      case "propagated_annotation":
        return <IconAnnotationPropagated style={{ color: "#2AA000" }} />;
      default:
        return null;
    }
  }, [type]);

  return icon && <Elem name="history-icon">{icon}</Elem>;
};

const HistoryItem = observer(HistoryItemComponent);

HistoryItem.displayName = "HistoryItem";

export const AnnotationHistory = injector(observer(AnnotationHistoryComponent));

AnnotationHistory.displayName = "AnnotationHistory";
