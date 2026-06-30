const fs = require("fs");
const pdf = require("pdf-parse");
const dir = "C:/Users/gentl/OneDrive/Desktop/보도자료 샘플/";
const files = [
  "260120__보도자료(6776억_원_규모_한국전력공사_입찰_담합_사건_수사_결과)-서울중앙지검.pdf",
  "260413_보도자료(일본군위안부_피해자_명예훼손_사건_구속_기소)-서울중앙지검_1.pdf",
];
(async () => {
  for (let i = 0; i < files.length; i++) {
    const d = await pdf(fs.readFileSync(dir + files[i]));
    fs.writeFileSync(process.argv[2] + "/pr" + i + ".txt", d.text, "utf8");
    console.log("OK", i, "chars", d.text.length);
  }
})();
