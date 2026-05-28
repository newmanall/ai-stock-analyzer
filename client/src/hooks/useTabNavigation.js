import { useState } from "react";

const TABS = [
  { id: "market", label: "行情" },
  { id: "analysis", label: "分析" },
  { id: "comprehensive", label: "综合" },
  { id: "data", label: "数据" },
];

export function useTabNavigation() {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("activeTab") || "market");

  return { activeTab, setActiveTab, tabs: TABS };
}
