import express, { type Express, type Request, type Response } from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import { extractFileController } from "@controllers/files.js";
import {
  listTemplatesController,
  createTemplateController,
  updateTemplateController,
  deleteTemplateController,
} from "@controllers/templates.js";

const PORT = process.env.PORT || 8000;

const app: Express = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN?.split(",") ?? [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ],
}));

app.use(
  fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
    abortOnLimit: true,
  }),
);

app.use(express.json());

app.post("/file/extract", extractFileController);
app.get("/templates", listTemplatesController);
app.post("/templates", createTemplateController);
app.put("/templates/:id", updateTemplateController);
app.delete("/templates/:id", deleteTemplateController);

app.listen(PORT, () => {
  console.log(`Backend app listening on http://localhost:${PORT}`);
});
