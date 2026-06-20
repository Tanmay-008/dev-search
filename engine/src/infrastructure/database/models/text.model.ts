import { Schema, model, Document } from "mongoose";

export interface IText extends Document {
    chunk_hash: string;
    url: string;
    title: string;
    description: string;
    chunk_text: string;
    s3_parsed_key: string;
    created_at: Date;
    updated_at: Date;
}

const TextSchema = new Schema<IText>({
    chunk_hash: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    chunk_text: { type: String, required: true },
    s3_parsed_key: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// ChunkSchema.index(
//     { title: "text", description: "text", chunk_text: "text" },
//     {
//         weights: { title: 10, description: 5, chunk_text: 1 },
//         name: "DocSearchIndex"
//     }
// );

export const TextModel = model<IText>("Text", TextSchema);