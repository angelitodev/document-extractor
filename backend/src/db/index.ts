import { MongoClient, ObjectId, type Collection } from "mongodb";
import type { AITemplateExtractor } from "@/types/templates.js";

type TemplateDoc = AITemplateExtractor & { _id: ObjectId };
type StoredTemplate = AITemplateExtractor & { id: string };

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/extractor";

function toStored({ _id, ...template }: TemplateDoc): StoredTemplate {
  return { id: _id.toHexString(), ...template };
}

class Database {
  private client = new MongoClient(MONGODB_URI);
  private collection: Collection<TemplateDoc> | null = null;

  // Connects lazily on first use so the server can start before Mongo is ready.
  private async templatesCollection() {
    if (!this.collection) {
      await this.client.connect();
      this.collection = this.client.db().collection<TemplateDoc>("templates");
    }
    return this.collection;
  }

  async templates(templateId: string): Promise<AITemplateExtractor | null> {
    if (!ObjectId.isValid(templateId)) return null;
    const collection = await this.templatesCollection();
    const doc = await collection.findOne({ _id: new ObjectId(templateId) });
    if (!doc) return null;
    const { id: _id, ...template } = toStored(doc);
    return template;
  }

  async listTemplates(): Promise<StoredTemplate[]> {
    const collection = await this.templatesCollection();
    const docs = await collection.find().sort({ _id: 1 }).toArray();
    return docs.map(toStored);
  }

  async createTemplate(template: AITemplateExtractor): Promise<StoredTemplate> {
    const collection = await this.templatesCollection();
    const _id = new ObjectId();
    await collection.insertOne({ _id, ...template });
    return { id: _id.toHexString(), ...template };
  }

  async updateTemplate(
    id: string,
    template: AITemplateExtractor,
  ): Promise<StoredTemplate | null> {
    if (!ObjectId.isValid(id)) return null;
    const collection = await this.templatesCollection();
    const result = await collection.replaceOne({ _id: new ObjectId(id) }, template);
    return result.matchedCount ? { id, ...template } : null;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const collection = await this.templatesCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }
}

export default new Database();
