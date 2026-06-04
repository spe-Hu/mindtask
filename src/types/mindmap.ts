/**
 * 思维导图类型定义
 * @description 定义思维导图数据结构和配置
 */

import type { TaskMetadata } from "./task";

/** SimpleMindMap 节点数据结构 */
export interface MindMapNode {
  data: {
    text: string;
    uid?: string;
    taskMetadata?: TaskMetadata;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  children?: MindMapNode[];
}

/** SimpleMindMap 完整数据 */
export interface MindMapData {
  data: MindMapNode["data"];
  children?: MindMapNode[];
}

/** 布局类型（对应 SimpleMindMap CONSTANTS.LAYOUT） */
export type MindMapLayout = "logicalStructure" | "logicalStructureLeft" | "mindMap" | "organizationStructure" | "catalogOrganization" | "timeline" | "timeline2" | "fishbone" | "fishbone2" | "verticalTimeline";

/** 主题类型 */
export type MindMapTheme = "default" | "classic" | "classic2" | "classic3" | "classic4" | "dark" | "simple";
