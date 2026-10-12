import type { LucideIcon } from 'lucide-react';
import styles from './demo-dashboard.module.css';

export function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyStateIcon} aria-hidden="true">
        <Icon strokeWidth={1.75} />
      </span>
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}
