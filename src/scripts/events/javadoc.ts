import { mkdir, readFile, rm } from "fs/promises";
import * as path from "path";
import cheerio from "cheerio";
import { zip } from "compressing";
import EventSource from "../EventSource.js";
import downloadArtifact from "../mvn/downloadArtifact.js";
import { EventType, SourceName } from "~/types.js";
import MultiProgress from "multi-progress";

/**
 * ファイルパスを取得する
 *
 * @param filename ファイル名
 */
export const javadocPath = (filename: string) => path.join("javadoc", filename);

/**
 * Javadoc をダウンロードする
 */
export const downloadJavadoc = async (sources: {
  [name: string]: EventSource;
}) => {
  console.info("Download Javadoc:");
  const multiProgress = new MultiProgress();
  await rm(javadocPath(""), { recursive: true, force: true });
  await mkdir(javadocPath(""));
  return await Promise.all(
    Object.entries(sources).map(([name_1, source]) =>
      downloadArtifact(
        multiProgress,
        name_1,
        source.artifact,
        javadocPath(`${name_1}.jar`),
        source.repository,
      )
        .then(() =>
          zip.uncompress(javadocPath(`${name_1}.jar`), javadocPath(name_1)),
        )
        .catch((err) => console.error(err)),
    ),
  );
};

const getSourceNameFromType = (type: SourceName) => {
  switch (type) {
    case "bukkit":
    case "spigot":
      return "Spigot";
    case "paper":
      return "Paper";
    case "purpur":
      return "Purpur";
    case "bungee":
      return "Bungee";
    case "waterfall":
      return "Waterfall";
    case "velocity":
      return "Velocity";
  }
};

export const updateJavadoc = (sources: { [name: string]: EventType }) => {
  return Promise.all(
    Object.values(sources).map((eventType) => {
      const sourceName = getSourceNameFromType(eventType.source);
      return readFile(javadocPath([sourceName, eventType.href].join("/"))).then(
        (body) => {
          try {
            const $ = cheerio.load(body);
            switch (eventType.source) {
              case "bukkit":
              case "spigot":
              case "paper":
              case "purpur":
              case "velocity":
                eventType.javadoc = $("#class-description .block").text();
                if (
                  $("#class-description .modifiers").text().includes("abstract")
                ) {
                  eventType.abstract = true;
                }
                break;
              case "bungee":
              case "waterfall":
                eventType.javadoc = $(".description .block").text();
                if ($(".description .modifiers").text().includes("abstract")) {
                  eventType.abstract = true;
                }
                break;
            }
            const annotations = $(
              "#class-description .type-signature .annotations",
            ).text();
            if (annotations.includes("@Experimental")) {
              eventType.deprecate = true;
              eventType.deprecateDescription = "実験段階。";
            }
            if (!eventType.javadoc) {
              delete eventType.javadoc;
            }
          } catch (e) {
            console.error(e);
          }
        },
      );
    }),
  );
};