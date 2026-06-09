// ─── UI Components Index ──────────────────────────────────────────────
// تصدير جميع المكونات من مكان واحد

export { default as GifPopup } from './GifPopup';
export { default as SearchableDropdown } from './SearchableDropdown';
export { default as Modal, ConfirmModal, AlertModal } from './Modal';
export { default as LinkifiedText, MarkdownText } from './LinkifiedText';
export {
  default as LoadingSpinner,
  SkeletonLoader,
  CardSkeleton,
  TableSkeleton,
  LoadingOverlay
} from './LoadingSpinner';

// ─── Components Object ─────────────────────────────────────────────────
export const components = {
  ui: {
    GifPopup,
    SearchableDropdown,
    Modal,
    ConfirmModal,
    AlertModal
  },
  shared: {
    LinkifiedText,
    MarkdownText,
    LoadingSpinner,
    SkeletonLoader,
    CardSkeleton,
    TableSkeleton,
    LoadingOverlay
  }
};

export default components;
