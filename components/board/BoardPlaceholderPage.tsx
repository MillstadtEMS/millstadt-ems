import type { ReactNode } from "react";
import { BoardEmptyState, BoardPageHeader } from "./BoardPrimitives";

export default function BoardPlaceholderPage({
  eyebrow = "Governance",
  title,
  emptyTitle,
  children,
  actions,
}: {
  eyebrow?: string;
  title: string;
  emptyTitle: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <>
      <BoardPageHeader eyebrow={eyebrow} title={title} actions={actions} />
      <BoardEmptyState title={emptyTitle}>{children}</BoardEmptyState>
    </>
  );
}
