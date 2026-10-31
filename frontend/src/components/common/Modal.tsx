import type { ReactNode } from "react";
import { TripSheet } from "../trip/TripSheet";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** The main action, pinned under the scrolling body (passed on to `TripSheet`). */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * A small popup for one question (who signs up, cancel a ride). It is a `TripSheet`, like everything else that
 * opens over a page: the same header, the same back-gesture handling, the same way of sliding up. Kept as its own
 * name so a call site reads as what it asks.
 */
export function Modal({ open, onClose, title, description, footer, children }: ModalProps) {
  return (
    <TripSheet open={open} onClose={onClose} title={title} subtitle={description} footer={footer}>
      {children}
    </TripSheet>
  );
}
