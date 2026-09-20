export type Json = null | boolean | number | string | Json[] | {
    [key: string]: Json;
};
export type Bag = Record<string, any>;
export const PLATFORMS = ['facebook', 'instagram', 'threads', 'whatsapp', 'messenger', 'instagram-dm', 'tiktok', 'linkedin', 'linkedin-page', 'x', 'telegram', 'youtube', 'pinterest', 'reddit', 'bluesky', 'mastodon', 'discord', 'farcaster', 'twitch', 'slack'] as const;
export type Platform = typeof PLATFORMS[number];
export const ROLES = ['viewer', 'editor', 'approver', 'admin'] as const;
export type Role = typeof ROLES[number];
export interface Principal {
    userId: string;
    workspaceId: string;
    role: Role;
    via: 'session' | 'token' | 'system' | 'telegram';
    brandId?: string;
}
export interface Entity<T = Bag> {
    id: string;
    workspaceId: string;
    brandId: string;
    kind: string;
    revision: number;
    createdAt: string;
    updatedAt: string;
    data: T;
}
export interface Brand {
    name: string;
    description: string;
    language: string;
    timezone: string;
    industry: string;
    target: string[];
    tone: string[];
    mission: string;
    colors: string[];
    logoAssetId?: string;
    bannedWords: string[];
    requiredPhrases: string[];
    approvedClaims: string[];
    objectives: string[];
    policy: {
        autoPublish: boolean;
        maxAutoRevisions: number;
        minReviewScore: number;
    };
}
export interface Account {
    name: string;
    platform: Platform;
    transport: 'direct' | 'postiz';
    targetId: string;
    credential: string;
    options: Bag;
    enabled: boolean;
}
export interface Media {
    id?: string;
    url?: string;
    mime: string;
    alt?: string;
    name?: string;
}
export type ContentStatus = 'DRAFT' | 'GENERATING' | 'GENERATED' | 'REVIEW_FAILED' | 'REVIEW_REQUIRED' | 'WAITING_APPROVAL' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHING' | 'PROCESSING' | 'PUBLISHED' | 'FAILED' | 'UNCERTAIN' | 'REJECTED';
export interface Claim {
    text: string;
    sourceIds: string[];
}
export interface Review {
    passed: boolean;
    score: number;
    issues: string[];
    version: string;
    checkedAt: string;
}
export interface Content {
    title: string;
    text: string;
    hashtags: string[];
    platform: Platform;
    format: 'text' | 'image' | 'carousel' | 'video' | 'reel' | 'story' | 'message' | 'template';
    accountId: string;
    objective: string;
    campaignId?: string;
    media: Media[];
    options: Bag;
    sourceIds: string[];
    claims: Claim[];
    status: ContentStatus;
    strategy?: Bag;
    creative?: Bag;
    review?: Review;
    approval?: {
        userId: string;
        at: string;
        digest: string;
        overrideReason?: string;
    };
    generatedBy?: string;
    scheduleAt?: string;
    publication?: Receipt;
}
export interface Receipt {
    state: 'PROCESSING' | 'PUBLISHED' | 'FAILED';
    externalId: string;
    url?: string;
    details?: Bag;
    error?: string;
}
export interface Job {
    id: string;
    workspaceId: string;
    brandId: string;
    kind: string;
    entityId: string;
    payload: Bag;
    state: string;
    dueAt: number;
    attempts: number;
    leaseUntil: number | null;
    leaseToken: string | null;
    error: string | null;
}
export interface Knowledge {
    title: string;
    text: string;
    type: string;
    platform: string;
    roles: string[];
    approved: boolean;
    source: string;
    validFrom?: string;
    validUntil?: string;
    embeddingModel?: string;
    chunks: {
        id: string;
        text: string;
        embedding?: number[];
    }[];
}
export interface Retrieved {
    id: string;
    documentId: string;
    title: string;
    text: string;
    score: number;
    source: string;
}
export interface SocialPost {
    id: string;
    text: string;
    title: string;
    format: Content['format'];
    media: Media[];
    options: Bag;
}
export interface Metrics {
    collectedAt: string;
    values: Record<string, number>;
    source: string;
    raw?: Bag;
}
