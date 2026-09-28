// The database schema: one @Table class per table. Edit a class, then run
// `chain migration add <name>` to generate the migration for the change.
export { AgentConnection, type AgentConnectionRow } from "./agent-connection";
export { AgentConversation, type AgentConversationRow } from "./agent-conversation";
export { AgentMessage, type AgentMessageRow } from "./agent-message";
export { AgentUsage, type AgentUsageRow } from "./agent-usage";
export { AiAction, type AiActionRow } from "./ai-action";
export { AiProfile, type AiProfileRow } from "./ai-profile";
export { Attachment, type AttachmentRow } from "./attachment";
export { Course, type CourseRow } from "./course";
export { Highlight, type HighlightRow } from "./highlight";
export { Module, type ModuleRow } from "./module";
export { Page, type PageRow } from "./page";
export { Settings, type SettingsRow } from "./settings";
