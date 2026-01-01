import axios from "axios";
import express from "express";
import cors from "cors";
const PORT = 4444;
const app = express();
import { spawn } from "child_process";
import youtubesearchapi from "youtube-search-api";


// const ytDlpPath =
//   "C:/Users/susha/Desktop/VSCODEFOLDER/testingindexdb/BeatVault/backend/yt-dlp.exe";

const ytDlpPath = process.env.YT_DLP_PATH || "/usr/bin/yt-dlp";
const denoPath = process.env.DENO_PATH || "/usr/bin/deno";

function downloadVideo(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(ytDlpPath, [
      // ← Relative path works
      url,
      // "--cookies-from-browser",
      // "firefox",
      "--cookies",
      "./cookies.txt",
      "-f",
      "bestaudio[ext=m4a]/bestaudio/best", // ← FIXED FORMAT
      "--extract-audio",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
      "-o",
      "-",
      "--retry-sleep",
      "5",
    ]);
    const chunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    child.stderr.on("data", (data: Buffer) => {
      // optional: log progress / errors from yt-dlp
      console.error("[yt-dlp]", data.toString());
    });

    child.on("error", (err) => {
      reject(err);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
  });
}

app.use(express.urlencoded());
app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);

app.get("/", async (req, res) => {
  res.send("WORKING PORT")
});

app.post("/yte", async (req, res) => {
  const searchitem = req.body.searchitem;
  const results = await youtubesearchapi.GetListByKeyword(
    searchitem,
    false,
    20,
    [{ type: "video" }]
  );
  console.log(results.items)
  res.send(results.items);
});


app.post("/servingvideodata", async (req, res) => {
  console.log("HELLO WORKING");
  const id = req.body.id;
  console.log(id);

  const videoBuffer = await downloadVideo(
    `https://www.youtube.com/watch?v=${id}`
  );

  const videoDataBinary = Uint8Array.from(videoBuffer);

  res.set({
    "Content-Type": "video/mp4",
    "Content-Length": videoDataBinary.length,
    "Access-Control-Allow-Origin": "*",
  });

  res.send(videoDataBinary);
});

app.post("/servingthumbnaildata", async (req, res) => {
  const imageurl = req.body.imageurl;
  console.log(imageurl);
  const response = await fetch(imageurl);
  const imagebuffer = await Buffer.from(await response.arrayBuffer());
  res.send(imagebuffer);
});

app.listen(PORT, () => {
  console.log("http://localhost:" + PORT);
});
