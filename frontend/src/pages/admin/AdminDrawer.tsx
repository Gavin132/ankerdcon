import { TripSheet } from "../../components/trip/TripSheet";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** The admin panel's edit panel: the same bottom sheet the rest of the app uses. */
export function AdminDrawer({ open, onClose, title, subtitle, children, footer }: Props) {
  return (
    <TripSheet open={open} onClose={onClose} title={title} subtitle={subtitle} footer={footer}>
      {children}
    </TripSheet>
  );
}
