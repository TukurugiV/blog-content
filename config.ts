import { defineCollection, z } from 'astro:content';
import { normalizeDateInput } from '../utils/formatDate';

// JST形式の日付文字列またはDateオブジェクトを受け入れるカスタムスキーマ
const jstDateSchema = z.union([
  z.string(),
  z.date()
]).transform((val) => {
  return normalizeDateInput(val);
});

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: jstDateSchema,
    updatedDate: jstDateSchema.optional(),
    author: z.string().default('創技 光'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    // シリーズ情報
    seriesId: z.string().optional(),
    seriesNumber: z.number().optional(),
  }),
});

const newsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: jstDateSchema,
    updatedDate: jstDateSchema.optional(),
    author: z.string().default('創技 光'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
  }),
});

const eventsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: jstDateSchema,
    updatedDate: jstDateSchema.optional(),
    eventDate: jstDateSchema,
    eventEndDate: jstDateSchema.optional(),
    location: z.string().optional(),
    author: z.string().default('創技 光'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
  }),
});

export const collections = {
  blog: blogCollection,
  news: newsCollection,
  events: eventsCollection,
};