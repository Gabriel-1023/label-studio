/**
 * Libraries
 */
import React, { Component } from "react";
import { Result, Spin } from "antd";
import { getEnv, getRoot } from "mobx-state-tree";
import { observer, Provider } from "mobx-react";

/**
 * Core
 */
import Tree from "../../core/Tree";
import { CommentsOverlay } from "../InteractiveOverlays/CommentsOverlay";
import { TreeValidation } from "../TreeValidation/TreeValidation";

/**
 * Tags
 */
import "../../tags/object";
import "../../tags/control";
import "../../tags/visual";

/**
 * Utils and common components
 */
import { Space } from "../../common/Space/Space";
import { Button } from "../../common/Button/Button";
import { Block, Elem } from "../../utils/bem";
import { isSelfServe } from "../../utils/billing";
import {
  FF_BULK_ANNOTATION,
  FF_DEV_3873,
  FF_LSDV_4620_3_ML,
  FF_PER_FIELD_COMMENTS,
  FF_SIMPLE_INIT,
  isFF,
} from "../../utils/feature-flags";
import { sanitizeHtml } from "../../utils/html";
import { reactCleaner } from "../../utils/reactCleaner";
import { guidGenerator } from "../../utils/unique";
import { isDefined, sortAnnotations } from "../../utils/utilities";
import { ToastProvider, ToastViewport } from "@humansignal/ui/lib/toast/toast";

/**
 * Components
 */
import { Annotation } from "./Annotation";
import { BottomBar } from "../BottomBar/BottomBar";
import Debug from "../Debug";
import { InstructionsModal } from "../InstructionsModal/InstructionsModal";
import { RelationsOverlay } from "../InteractiveOverlays/RelationsOverlay";
import Segment from "../Segment/Segment";
import Settings from "../Settings/Settings";
import { SidePanels } from "../SidePanels/SidePanels";
import { SideTabsPanels } from "../SidePanels/TabPanels/SideTabsPanels";
import { TopBar } from "../TopBar/TopBar";
import { ViewAll } from "./ViewAll";

/**
 * Styles
 */
import "./App.scss";

/**
 * App
 */
class App extends Component {
  relationsRef = React.createRef();

  componentDidMount() {
    // Hack to activate app hotkeys
    window.blur();
    document.body.focus();
  }

  renderSuccess() {
    return (
      <Block name="editor">
        <Result status="success" title={getEnv(this.props.store).messages.DONE} />
      </Block>
    );
  }

  renderNoAnnotation() {
    return (
      <Block name="editor">
        <Result status="success" title={getEnv(this.props.store).messages.NO_COMP_LEFT} />
      </Block>
    );
  }

  renderNothingToLabel(store) {
    return (
      <Block
        name="editor"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          paddingBottom: "30vh",
        }}
      >
        <Result status="success" title={getEnv(this.props.store).messages.NO_NEXT_TASK} />
        <Block name="sub__result">All tasks in the queue have been completed</Block>
        {store.taskHistory.length > 0 && (
          <Button onClick={(e) => store.prevTask(e, true)} look="outlined" style={{ margin: "16px 0" }}>
            Go to Previous Task
          </Button>
        )}
      </Block>
    );
  }

  renderNoAccess() {
    return (
      <Block name="editor">
        <Result status="warning" title={getEnv(this.props.store).messages.NO_ACCESS} />
      </Block>
    );
  }

  renderConfigValidationException(store) {
    return (
      <Block name="main-view">
        <Elem name="annotation">
          <TreeValidation errors={this.props.store.annotationStore.validation} />
        </Elem>
        {!isFF(FF_DEV_3873) && store.hasInterface("infobar") && <Elem name="infobar">Task #{store.task.id}</Elem>}
      </Block>
    );
  }

  renderLoader() {
    return <Result icon={<Spin size="large" />} />;
  }

  _renderAll(obj) {
    if (obj.length === 1) return <Segment annotation={obj[0]}>{[Tree.renderItem(obj[0].root)]}</Segment>;
    const renderAllClassName = cn("renderall").toClassName();
    const fadeClassName = cn("fade").toClassName();
    return (
      <div className={renderAllClassName}>
        {obj.map((c, i) => (
          <div key={`all-${i}`} className={fadeClassName}>
            <Segment annotation={c}>{[Tree.renderItem(c.root)]}</Segment>
          </div>
        ))}
      </div>
    );
  }

  _renderUI(root, as) {
    if (as.viewingAll) return this.renderAllAnnotations();

    return (
      <Block key={(as.selectedHistory ?? as.selected)?.id} name="main-view" onScrollCapture={this._notifyScroll}>
        <Elem name="annotation">
          {<Annotation root={root} annotation={as.selected} />}
          {this.renderRelations(as.selected)}
          {isFF(FF_PER_FIELD_COMMENTS) && this.renderCommentsOverlay(as.selected)}
        </Elem>
        {!isFF(FF_DEV_3873) && getRoot(as).hasInterface("infobar") && this._renderInfobar(as)}
      </Block>
    );
  }

  _renderInfobar(as) {
    const { id, queue } = getRoot(as).task;

    return (
      <Elem name="infobar" tag={Space} size="small">
        <span>Task #{id}</span>

        {queue && <span>{queue}</span>}
      </Elem>
    );
  }

  renderAllAnnotations() {
    const as = this.props.store.annotationStore;
    const entities = [...as.annotations, ...as.predictions];

    if (isFF(FF_SIMPLE_INIT)) {
      // the same sorting we have in AnnotationsCarousel, so we'll see the same order in both places
      sortAnnotations(entities);
    }

    return <ViewAll store={as} annotations={entities} root={as.root} />;
  }

  renderRelations(selectedStore) {
    const store = selectedStore.relationStore;
    const taskData = this.props.store.task?.data;

    return (
      <RelationsOverlay
        key={guidGenerator()}
        store={store}
        ref={this.relationsRef}
        tags={selectedStore.names}
        taskData={taskData}
      />
    );
  }

  renderCommentsOverlay(selectedAnnotation) {
    const { store } = this.props;
    const { commentStore } = store;

    if (!store.hasInterface("annotations:comments") || !commentStore.isCommentable) return null;
    return <CommentsOverlay commentStore={commentStore} annotation={selectedAnnotation} />;
  }

  render() {
    const { store } = this.props;
    const as = store.annotationStore;
    const root = as.selected && as.selected.root;
    const { settings } = store;

    if (store.isLoading) return this.renderLoader();

    if (store.noTask) return this.renderNothingToLabel(store);

    if (store.noAccess) return this.renderNoAccess();

    if (store.labeledSuccess) return this.renderSuccess();

    if (!root) return this.renderNoAnnotation();

    const viewingAll = as.viewingAll;

    // tags can be styled in config when user is awaiting for suggestions from ML backend
    const mainContent = (
      <Block name="main-content" mix={store.awaitingSuggestions ? ["requesting"] : []}>
        {as.validation === null
          ? this._renderUI(as.selectedHistory?.root ?? root, as)
          : this.renderConfigValidationException(store)}
      </Block>
    );

    const isBulkMode = isFF(FF_BULK_ANNOTATION) && !isSelfServe() && store.hasInterface("annotation:bulk");
    const newUIEnabled = isFF(FF_DEV_3873);

    return (
      <Block
        name="editor"
        mod={{ fullscreen: settings.fullscreen }}
        ref={isFF(FF_LSDV_4620_3_ML) ? reactCleaner(this) : null}
      >
        <Settings store={store} />
        <Provider store={store}>
          <ToastProvider>
            {newUIEnabled ? (
              <InstructionsModal
                visible={store.showingDescription}
                onCancel={() => store.toggleDescription()}
                title={store.hasInterface("review") ? "Review Instructions" : "Labeling Instructions"}
              >
                {store.description}
              </InstructionsModal>
            ) : (
              <>
                {store.showingDescription && (
                  <Segment>
                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(store.description) }} />
                  </Segment>
                )}
              </>
            )}

            {isDefined(store) && store.hasInterface("topbar") && <TopBar store={store} />}
            <Block
              name="wrapper"
              mod={{
                viewAll: viewingAll,
                bsp: settings.effectiveBottomSidePanel,
                showingBottomBar: newUIEnabled,
              }}
            >
              {newUIEnabled ? (
                isBulkMode || !store.hasInterface("side-column") ? (
                  <>
                    {mainContent}
                    {store.hasInterface("topbar") && <BottomBar store={store} />}
                  </>
                ) : (
                  <SideTabsPanels
                    panelsHidden={viewingAll}
                    currentEntity={as.selectedHistory ?? as.selected}
                    regions={as.selected.regionStore}
                    showComments={store.hasInterface("annotations:comments")}
                    focusTab={store.commentStore.tooltipMessage ? "comments" : null}
                  >
                    {mainContent}
                    {store.hasInterface("topbar") && <BottomBar store={store} />}
                  </SideTabsPanels>
                )
              ) : isBulkMode || !store.hasInterface("side-column") ? (
                mainContent
              ) : (
                <SidePanels
                  panelsHidden={viewingAll}
                  currentEntity={as.selectedHistory ?? as.selected}
                  regions={as.selected.regionStore}
                >
                  {mainContent}
                </SidePanels>
              )}
            </Block>
            <ToastViewport />
          </ToastProvider>
        </Provider>
        {store.hasInterface("debug") && <Debug store={store} />}
      </Block>
    );
  }

  _notifyScroll = () => {
    if (this.relationsRef.current) {
      this.relationsRef.current.onResize();
    }
  };
}

export default observer(App);
