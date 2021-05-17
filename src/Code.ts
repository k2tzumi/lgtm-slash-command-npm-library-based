import { Slack } from "./slack/types/index.d";
import { SlackHandler } from "./SlackHandler";
import { SlashCommandFunctionResponse } from "./SlashCommandHandler";
import { SlackWebhooks } from "./SlackWebhooks";
import { DuplicateEventError } from "./CallbackEventHandler";
import { JobBroker } from "./JobBroker";
import { CustomImageSearchClient, ImageItem } from "./CustomImageSearchClient";
import { imageSize } from "image-size";
import Jimp from "jimp";

type TextOutput = GoogleAppsScript.Content.TextOutput;
type DoPost = GoogleAppsScript.Events.DoPost;
type Commands = Slack.SlashCommand.Commands;
type Blob = GoogleAppsScript.Base.Blob;

function asyncLogging(): void {
  const jobBroker: JobBroker = new JobBroker();
  jobBroker.consumeJob((parameter: Record<string, any>) => {
    console.info(JSON.stringify(parameter));
  });
}

const COMMAND = "/lgtm";

function doPost(e: DoPost): TextOutput {
  const properties = PropertiesService.getScriptProperties();
  const VERIFICATION_TOKEN: string = properties.getProperty(
    "VERIFICATION_TOKEN"
  );

  const slackHandler = new SlackHandler(VERIFICATION_TOKEN);

  slackHandler.addCommandListener(COMMAND, executeSlashCommand);

  try {
    const process = slackHandler.handle(e);

    if (process.performed && process.output) {
      return process.output;
    }
  } catch (exception) {
    if (exception instanceof DuplicateEventError) {
      return ContentService.createTextOutput();
    } else {
      new JobBroker().enqueue(asyncLogging, {
        message: exception.message,
        stack: exception.stack,
      });
      throw exception;
    }
  }

  throw new Error(`No performed handler, request: ${JSON.stringify(e)}`);
}

function executeSlashCommand(commands: Commands): SlashCommandFunctionResponse {
  switch (commands.text) {
    case "":
    case "help":
      return createUsageResponse();
    default:
      new JobBroker().enqueue(executeCommandLgtm, commands);

      return {
        response_type: "ephemeral",
        text: "Please wait",
      };
  }
}

function createUsageResponse(): SlashCommandFunctionResponse {
  return {
    response_type: "ephemeral",
    text: `*Usage*\n* ${COMMAND} [url|word]\n* ${COMMAND} help`,
  };
}

const executeCommandLgtm = (): void => {
  const jobBroker: JobBroker = new JobBroker();
  jobBroker.consumeJob((commands: Commands) => {
    const webhook = new SlackWebhooks(commands.response_url);
    const url = commands.text.match(/https?:\/\//);

    if (url) {
      webhook.sendText(createLgtmResponse(url[0]));
    } else {
      webhook.sendText(
        createLgtmResponse(pickupImage(executeSearch(commands.text)).link)
      );
    }
  });
};

function createLgtmResponse(url: string): string {
  const driveUrl = (async () => {
    const buffer = await createLgtmImage(url);

    const blob = Utilities.newBlob(
      [...buffer.values()],
      Jimp.MIME_PNG,
      `lgtm-${url}.png`
    );
    return uploadDrive(blob, `origin: ${url}`);
  })();

  return `![LGTM](${driveUrl})`;
}

function executeSearch(word: string): ImageItem[] {
  const properties = PropertiesService.getScriptProperties();
  const GOOGLE_API_KEY = properties.getProperty("GOOGLE_API_KEY") || "";
  const CUSTOM_SEARCH_ENGINE_ID =
    properties.getProperty("CUSTOM_SEARCH_ENGINE_ID") || "";

  const cient = new CustomImageSearchClient(
    GOOGLE_API_KEY,
    CUSTOM_SEARCH_ENGINE_ID
  );

  return cient.search(word);
}

function pickupImage(images: ImageItem[]): ImageItem {
  const pickup: number = Math.floor(Math.random() * images.length);
  return images[pickup];
}

function createLgtmImage(url: string): Promise<Buffer> {
  const originalImage = Buffer.from(
    new Uint8Array(UrlFetchApp.fetch(url).getContent())
  );
  const dimensions = imageSize(originalImage);
  return (async (): Promise<Buffer> => {
    const image = await Jimp.read(originalImage);
    if (dimensions.width > 400) {
      image.resize(400, Jimp.AUTO);
    }

    return image
      .print(
        await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE),
        0,
        0,
        {
          text: "LGTM",
          alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
          alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
        },
        dimensions.width,
        dimensions.height
      )
      .print(
        await Jimp.loadFont(Jimp.FONT_SANS_8_WHITE),
        0,
        20,
        {
          text: "L o o k s   g o o d   t o   m e .",
          alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
          alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
        },
        dimensions.width,
        dimensions.height
      )
      .getBufferAsync(Jimp.MIME_PNG);
  })();
}

function uploadDrive(blob: Blob, description: string): string {
  const fileIteraater = DriveApp.getFilesByName(blob.getName());

  if (fileIteraater.hasNext()) {
    const cache = fileIteraater.next();
    cache.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );

    return cache.getDownloadUrl();
  } else {
    try {
      const file = DriveApp.createFile(blob);
      file.setName(blob.getName());
      file.setDescription(description);
      file.setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.VIEW
      );

      return file.getDownloadUrl();
    } catch (e) {
      console.warn(`upload drive faild. ${e.message}`);
      return "https://placehold.jp/400x400.png?text=414";
    }
  }
}

export {
  doPost,
  executeSlashCommand,
  executeCommandLgtm,
  createLgtmImage,
  asyncLogging,
};
