import fs from "fs";

/**
 * ファイルから文字列を読み取る
 */
export const readFile = (fileName: string): string => {
  return fs.readFileSync(fileName, "utf8");
};

/**
 * ファイルに文字列を書き込む
 */
export const writeFile = (fileName: string, content: string) => {
  fs.writeFile(fileName, content, "utf8", (e) => {
    if (e) {
      console.error(e.message);
    }
  });
};