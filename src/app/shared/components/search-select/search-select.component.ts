import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  forwardRef,
  input,
  signal,
  computed,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SearchSelectOption {
  value: string;
  label: string;
  hint?: string;
}

@Component({
  selector: 'app-search-select',
  templateUrl: './search-select.component.html',
  styleUrl: './search-select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchSelectComponent),
      multi: true,
    },
  ],
})
export class SearchSelectComponent implements ControlValueAccessor {
  private readonly host = inject(ElementRef<HTMLElement>);

  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  readonly options = input<SearchSelectOption[]>([]);
  readonly placeholder = input('Seleccionar…');
  readonly searchPlaceholder = input('Buscar…');
  readonly emptyMessage = input('Sin resultados');
  readonly inputId = input('');

  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly disabled = signal(false);
  protected readonly value = signal('');

  protected readonly selectedOption = computed(() =>
    this.options().find((option) => option.value === this.value()) ?? null,
  );

  protected readonly filteredOptions = computed(() => {
    const term = this.query().trim().toLowerCase();
    if (!term) return this.options();

    return this.options().filter((option) => {
      const label = option.label.toLowerCase();
      const hint = option.hint?.toLowerCase() ?? '';
      return label.includes(term) || hint.includes(term);
    });
  });

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    if (isDisabled) {
      this.closePanel();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.closePanel();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closePanel();
  }

  protected togglePanel(): void {
    if (this.disabled()) return;

    if (this.open()) {
      this.closePanel();
      return;
    }

    this.open.set(true);
    this.query.set('');
    queueMicrotask(() => this.searchInput?.nativeElement.focus());
  }

  protected onSearchInput(value: string): void {
    this.query.set(value);
    if (!this.open()) {
      this.open.set(true);
    }
  }

  protected selectOption(option: SearchSelectOption): void {
    this.value.set(option.value);
    this.onChange(option.value);
    this.onTouched();
    this.closePanel();
  }

  protected clearSelection(event: MouseEvent): void {
    event.stopPropagation();
    this.value.set('');
    this.onChange('');
    this.onTouched();
    this.query.set('');
  }

  private closePanel(): void {
    this.open.set(false);
    this.query.set('');
    this.onTouched();
  }
}
