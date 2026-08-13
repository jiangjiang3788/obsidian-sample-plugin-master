/** @jsxImportSource preact */
import { h, type ComponentChildren } from 'preact';

type Children = ComponentChildren;

export function ViewEditorShell({ title, description, children, className = 'think-view-editor-shell' }: {
  title?: Children; description?: Children; children?: Children; className?: string;
}) {
  return (
    <div className={className}>
      {(title || description) && (
        <header className="think-view-editor-shell__header">
          {title && <div className="think-view-editor-shell__title">{title}</div>}
          {description && <div className="think-view-editor-shell__description">{description}</div>}
        </header>
      )}
      {children}
    </div>
  );
}

export function ConfigSection({ title, description, children, className, titleClassName, descriptionClassName }: {
  title?: Children; description?: Children; children?: Children; className?: string; titleClassName?: string; descriptionClassName?: string;
}) {
  const sectionClass = ['think-view-editor-section', className].filter(Boolean).join(' ');
  const titleClass = ['think-view-editor-section__title', titleClassName].filter(Boolean).join(' ');
  const descriptionClass = ['think-view-editor-section__description', descriptionClassName].filter(Boolean).join(' ');
  return (
    <section className={sectionClass}>
      {(title || description) && (
        <header className="think-view-editor-section__header">
          {title && <div className={titleClass}>{title}</div>}
          {description && <div className={descriptionClass}>{description}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function ConfigFieldRow({ label, description, children, alignItems = 'center' }: {
  label: Children; description?: Children; children: Children; alignItems?: 'center' | 'flex-start';
}) {
  return (
    <div
      className={['think-view-editor-field-row', alignItems === 'flex-start' ? 'think-view-editor-field-row--top' : ''].filter(Boolean).join(' ')}
    >
      <div className="think-view-editor-field-row__label">{label}</div>
      <div className="think-view-editor-field-row__control">
        {children}
        {description && <div className="think-view-editor-field-row__description">{description}</div>}
      </div>
    </div>
  );
}

export function ReadonlyViewEditorNotice({ title, description }: { title: Children; description?: Children }) {
  return <ViewEditorShell title={title} description={description} />;
}
