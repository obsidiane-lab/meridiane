import { NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef, computed, input, linkedSignal, model, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronsLeft, lucideChevronsRight } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmPaginationImports } from '@spartan-ng/helm/pagination';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';

type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end';

@Component({
  selector: 'app-table-footer',
  imports: [
    NgIcon,
    TranslatePipe,
    NgTemplateOutlet,
    HlmButtonImports,
    HlmFieldImports,
    HlmNativeSelectImports,
    HlmPaginationImports,
    HlmSeparatorImports,
  ],
  providers: [provideIcons({ lucideChevronsLeft, lucideChevronsRight })],
  templateUrl: './table-footer.component.html',
  host: { class: 'block' },
})
export class TableFooterComponent {
  private static nextId = 0;

  readonly maxItems = input(0);
  readonly currentPage = input(1);
  readonly itemsPerPage = model(10);
  readonly actionTemplate = input<TemplateRef<unknown> | null>(null);

  protected readonly currentPageState = linkedSignal(() => this.currentPage());
  protected readonly itemsPerPageSelectId = `app-table-items-per-page-${++TableFooterComponent.nextId}`;

  readonly pageChange = output<number>();

  protected readonly itemsPerPageOptions = [5, 10, 20, 30, 50, 100];

  protected readonly totalPages = computed(() => Math.ceil(this.maxItems() / this.itemsPerPage()) || 1);

  protected readonly pageItems = computed(() => this.buildPageItems(this.totalPages(), this.currentPageState()));

  protected readonly startItem = computed(() =>
    this.maxItems() === 0 ? 0 : (this.currentPageState() - 1) * this.itemsPerPage() + 1,
  );

  protected readonly endItem = computed(() => {
    const endItem = this.currentPageState() * this.itemsPerPage();
    return endItem > this.maxItems() ? this.maxItems() : endItem;
  });

  protected goToFirstPage(): void {
    this.currentPageState.set(1);
    this.pageChange.emit(this.currentPageState());
  }

  protected goToLastPage(): void {
    this.currentPageState.set(this.totalPages());
    this.pageChange.emit(this.currentPageState());
  }

  protected onPageChange(page: number): void {
    if (page !== this.currentPageState()) {
      this.currentPageState.set(page);
      this.pageChange.emit(this.currentPageState());
    }
  }

  protected onItemsPerPageChange(value: string | null | undefined): void {
    const itemsPerPage = Number(value);
    if (!Number.isInteger(itemsPerPage) || !this.itemsPerPageOptions.includes(itemsPerPage)) {
      return;
    }
    this.itemsPerPage.set(itemsPerPage);
    this.currentPageState.set(1);
  }

  private buildPageItems(totalPages: number, currentPage: number, maxButtons = 5): PaginationItem[] {
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const clampedCurrent = Math.min(Math.max(currentPage, 1), totalPages);
    const start = Math.max(2, clampedCurrent - 1);
    const end = Math.min(totalPages - 1, clampedCurrent + 1);
    const pages: PaginationItem[] = [1];

    if (start > 2) {
      pages.push('ellipsis-start');
    }
    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }
    if (end < totalPages - 1) {
      pages.push('ellipsis-end');
    }
    pages.push(totalPages);

    return pages;
  }
}
