export const widgetSizes = ["small", "medium", "wide", "large"] as const;

export type WidgetSize = (typeof widgetSizes)[number];

export type WidgetConfig = { title?: string } & Record<string, unknown>;

export type Widget = { id: number; kind: string; size: WidgetSize; config: WidgetConfig };

export type NewWidget = Omit<Widget, "id">;
