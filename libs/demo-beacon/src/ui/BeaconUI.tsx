import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { DemoBeaconContext } from '../registry/context';
import { CSS, STYLE_ELEMENT_ID } from './styles';
import { Section } from './Sections';
import { Markdown } from './Markdown';

interface BeaconUIProps {
  appName: string;
  position: 'bottom-right' | 'bottom-left';
  offset: { x: number; y: number };
  theme?: Record<string, string>;
}

function useInjectedStyles() {
  useLayoutEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ELEMENT_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ELEMENT_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);
}

/**
 * The launcher pill + the Radix-dialog panel. Rendered only when the Beacon is enabled (mounted by
 * the provider). Open state lives here and survives navigation because this component stays mounted
 * across route changes; it's intentionally not persisted, so a fresh page load starts closed unless
 * the active page sets `openByDefault`.
 * The dialog is non-modal — the page stays scrollable and interactive behind the panel, which is the
 * point of a demo helper — while Radix still gives us Escape-to-close, focus-on-open, and
 * focus-return plus the aria wiring.
 */
export function BeaconUI({ appName, position, offset, theme }: BeaconUIProps) {
  useInjectedStyles();
  const ctx = useContext(DemoBeaconContext);
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  const config = ctx?.activeConfig ?? null;
  const pageId = config?.pageId;

  // Swap content in place on navigation: reset scroll to the top when the active page changes.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [pageId]);

  // Auto-open a page that asks for it, once per page load. Tracked by pageId so closing the panel
  // isn't undone by re-renders, and navigating away and back within the same load doesn't reopen it.
  const autoOpenedRef = useRef(new Set<string>());
  const openingAutomaticallyRef = useRef(false);
  const wantsAutoOpen = Boolean(config?.openByDefault);
  useEffect(() => {
    if (!pageId || !wantsAutoOpen || autoOpenedRef.current.has(pageId)) return;
    autoOpenedRef.current.add(pageId);
    openingAutomaticallyRef.current = true;
    setOpen(true);
  }, [pageId, wantsAutoOpen]);

  // Nothing registered and no fallback → hide entirely.
  if (!config) return null;

  const side: CSSProperties = position === 'bottom-left' ? { left: offset.x } : { right: offset.x };
  const themeStyle = theme as CSSProperties | undefined;
  const launcherStyle: CSSProperties = { ...themeStyle, ...side, bottom: offset.y };
  const panelStyle: CSSProperties = { ...themeStyle, ...side, bottom: offset.y + 60 };

  const navigateAndClose = (path: string) => {
    ctx?.onNavigate?.(path);
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen} modal={false}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="dbc-launcher"
          style={launcherStyle}
          aria-label="Demo guide"
        >
          <span className="dbc-launcher-icon" aria-hidden>
            {open ? '✕' : 'ⓘ'}
          </span>
          {open ? 'Close' : 'Demo guide'}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Content
          className="dbc-panel"
          style={panelStyle}
          // Non-modal: don't trap the page or lock scroll — testers need the app behind the panel.
          onInteractOutside={(e) => e.preventDefault()}
          // An automatic open must not pull focus off the page (e.g. the sign-in email field); a
          // tester's own click on the launcher still moves focus into the panel as usual.
          onOpenAutoFocus={(e) => {
            if (openingAutomaticallyRef.current) {
              e.preventDefault();
              openingAutomaticallyRef.current = false;
            }
          }}
        >
          <div className="dbc-header">
            <div className="dbc-header-titles">
              <div className="dbc-eyebrow">{appName}</div>
              <Dialog.Title className="dbc-title">{config.title}</Dialog.Title>
              {/* Always present for aria-describedby; visually hidden when there's no summary. */}
              <Dialog.Description className={config.summary ? 'dbc-summary' : 'dbc-sr'}>
                {config.summary ? (
                  <Markdown text={config.summary} onNavigate={ctx?.onNavigate} />
                ) : (
                  `${config.title} demo guide`
                )}
              </Dialog.Description>
            </div>
            <Dialog.Close className="dbc-close" aria-label="Close demo guide">
              ✕
            </Dialog.Close>
          </div>

          <div className="dbc-body" ref={bodyRef}>
            {config.sections.map((section, i) => (
              <Section
                key={`${section.kind}-${i}`}
                section={section}
                ctx={{ onNavigate: ctx?.onNavigate, navigateAndClose, announce: setAnnouncement }}
              />
            ))}
          </div>

          <div className="dbc-sr" role="status" aria-live="polite">
            {announcement}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
