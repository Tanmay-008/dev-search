import { Schema, model, Document } from "mongoose";

export interface IText extends Document {
    chunk_hash: string;
    url: string;
    title: string;
    description: string;
    chunk_text: string;
    s3_parsed_key: string;
    media_s3_key?: string;
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
    media_s3_key: { type: String, required: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});


export const TextModel = model<IText>("Text", TextSchema);