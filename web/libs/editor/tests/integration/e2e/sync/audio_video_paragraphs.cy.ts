import { AudioView, LabelStudio } from "@humansignal/frontend-test/helpers/LSF";

const config = `
<View>
  <Video name="video" value="$url" sync="v1" />
  <Audio name="audio" value="$url" hotkey="space" sync="v1" />
  <Header value="Sentiment"/>
  <ParagraphLabels name="label" toName="text">
    <Label value="General: Positive" background="#00ff00"/>
    <Label value="General: Negative" background="#ff0000"/>
    <Label value="Company: Positive" background="#7dff7d"/>
    <Label value="Company: Negative" background="#ff7d7d"/>
    <Label value="External: Positive" background="#4bff4b"/>
    <Label value="External: Negative" background="#ff4b4b"/>
  </ParagraphLabels>
  <View style="height: 400px; overflow-y: auto">
    <Header value="Transcript"/>
    <Paragraphs audioUrl="$url" name="text" value="$text" layout="dialogue" textKey="text" nameKey="author" showplayer="true" sync="v1" />
  </View>
</View>
`;

const data = {
  url: "/public/files/opossum_intro.webm",
  text: [
    {
      end: 5.6,
      text: "Dont you hate that?",
      start: 3.1,
      author: "Mia Wallace",
    },
    {
      text: "Hate what?",
      start: 4.2,
      author: "Vincent Vega:",
      duration: 3.1,
    },
    {
      text: "Uncomfortable silences. Why do we feel its necessary to yak about nonsense in order to be comfortable?",
      author: "Mia Wallace:",
    },
    {
      text: "I dont know. Thats a good question.",
      start: 90,
      author: "Vincent Vega:",
    },
    {
      text: "Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.",
      author: "Mia Wallace:",
    },
  ],
};

const annotations = [
  {
    value: {
      start: "0",
      end: "0",
      startOffset: 0,
      endOffset: 4,
      text: "Dont",
      paragraphlabels: ["General: Negative"],
    },
    id: "RcHv5CdYBt",
    from_name: "label",
    to_name: "text",
    type: "paragraphlabels",
    origin: "manual",
  },
  {
    value: {
      start: "0",
      end: "0",
      startOffset: 9,
      endOffset: 13,
      text: "hate",
      paragraphlabels: ["General: Positive"],
    },
    id: "eePG7PVYH7",
    from_name: "label",
    to_name: "text",
    type: "paragraphlabels",
    origin: "manual",
  },
];

describe("Sync: Video Paragraphs", () => {
  beforeEach(() => {
    LabelStudio.addFeatureFlagsOnPageLoad({
      ff_front_dev_2715_audio_3_280722_short: true,
      fflag_feat_front_lsdv_e_278_contextual_scrolling_short: true,
    });
    // expect uncaught exception for fast play/pause
    cy.on("uncaught:exception", () => false);
  });

  it("Play/pause is synced between audio, video when interacting with video interface", () => {
    LabelStudio.params().config(config).data(data).withResult(annotations).init();

    LabelStudio.waitForObjectsReady();
    AudioView.isReady();

    cy.log("Audio, Video are starting at 0");
    cy.get("audio").then(([audio]) => {
      cy.get("video").then(([video]) => {
        expect(audio.currentTime).to.equal(video.currentTime);
        expect(audio.currentTime).to.equal(0);
      });
    });

    AudioView.playButton.click();
    cy.wait(100);

    cy.log("Audio, Video are playing");
    cy.get("audio").then(([audio]) => {
      cy.get("video").then(([video]) => {
        expect(audio.paused).to.equal(video.paused);
        expect(audio.paused).to.equal(false);
      });
    });

    AudioView.pauseButton.click();
    cy.wait(900);

    cy.log("Audio, Video are played to the same time and are now paused");
    cy.get("audio").then(([audio]) => {
      cy.get("video").then(([video]) => {
        expect(audio.paused).to.equal(video.paused);
        expect(audio.paused).to.equal(true);
        expect(audio.currentTime).to.be.closeTo(video.currentTime, 0.1);
      });
    });
  });

  it("Seeking is synced between audio, video when interacting with audio interface", () => {
    LabelStudio.params().config(config).data(data).withResult(annotations).init();

    LabelStudio.waitForObjectsReady();
    AudioView.isReady();

    cy.get("audio").then(([audio]) => {
      cy.get("video").then(([video]) => {
        expect(audio.currentTime).to.equal(video.currentTime);
      });
    });

    cy.wait(100);
    AudioView.clickAt(100, 0);
    cy.log("Seek by clicking on some point in the audio timeline");
    cy.get("audio").then(([audio]) => {
      cy.get("video").then(([video]) => {
        expect(audio.currentTime).to.equal(video.currentTime);
      });
    });

    cy.wait(100);
    AudioView.clickAt(0, 0);
    cy.log("Seek to beginning by clicking on the first point in the audio timeline");
    cy.get("audio").then(([audio]) => {
      cy.get("video").then(([video]) => {
        expect(audio.currentTime).to.equal(video.currentTime);
      });
    });

    cy.wait(100);
    AudioView.clickAt(300, 0);
    cy.log("Seek by clicking on some point further in the audio timeline");
    cy.get("audio").then(([audio]) => {
      cy.get("video").then(([video]) => {
        expect(audio.currentTime).to.equal(video.currentTime);
      });
    });

    cy.wait(100);
    // Calculate the end to click on
    AudioView.clickAt(700, 0);
    cy.log("Seek to end by clicking on the last point in the audio timeline");
    cy.get("audio").then(([audio]) => {
      cy.get("video").then(([video]) => {
        expect(audio.currentTime).to.equal(video.currentTime);
      });
    });
    cy.wait(100);

    AudioView.playButton.click();
    cy.wait(100);
    AudioView.pauseButton.click();
    cy.wait(100);

    cy.log(
      "Seek playback from paragraph. Audio, video and paragraph audio are played to the same time and are now paused",
    );
    cy.get("audio").then(([audio]) => {
      cy.get("video").then(([video]) => {
        expect(audio.paused).to.equal(video.paused);
        expect(audio.paused).to.equal(true);
        expect(audio.currentTime).to.be.closeTo(video.currentTime, 0.1);
      });
    });
  });

  it("Playback speed is synced between audio, video, paragraph audio when interacting with audio interface", () => {
    LabelStudio.params().config(config).data(data).withResult(annotations).init();

    LabelStudio.waitForObjectsReady();
    AudioView.isReady();

    cy.get("audio").then(([audio]) => {
      cy.get("video").then(([video]) => {
        expect(audio.playbackRate).to.equal(video.playbackRate);
        expect(audio.playbackRate).to.equal(1);
      });
    });

    AudioView.setPlaybackSpeedInput(1.5);
    AudioView.playButton.click();

    cy.log("Changing playback speed to 1.5x for audio, video and paragraph audio during playback");
    cy.get("audio").then(([audio]) => {
      cy.get("video").then(([video]) => {
        expect(audio.playbackRate).to.equal(video.playbackRate);
        expect(audio.playbackRate).to.equal(1.5);
      });
    });

    cy.wait(100); // wait for audio to play for a bit at 1.5x speed
    AudioView.setPlaybackSpeedInput(1);

    cy.log("Changing playback speed to 1x for audio, video and paragraph audio during playback");
    cy.get("audio").then(([audio]) => {
      cy.get("video").then(([video]) => {
        expect(audio.playbackRate).to.equal(video.playbackRate);
        expect(audio.playbackRate).to.equal(1);
      });
    });

    AudioView.pauseButton.click();
    cy.log("Audio, video and paragraph audio played to the same time");
    cy.get("audio").then(([audio]) => {
      cy.get("video").then(([video]) => {
        expect(audio.currentTime).to.be.closeTo(video.currentTime, 0.1);
      });
    });
  });
});
