import type { AbstractControl, ValidationErrors } from '@angular/forms';
import type { TranslateService } from '@ngx-translate/core';

type Translator = Pick<TranslateService, 'instant'>;

export function controlErrorMessage(control: AbstractControl | null | undefined, translate: Translator): string {
  if (!control?.errors || !(control.touched || control.dirty)) {
    return '';
  }

  return validationErrorMessage(control.errors, translate);
}

function validationErrorMessage(errors: ValidationErrors, translate: Translator): string {
  if (errors['required']) return translate.instant('form.required');
  if (errors['email']) return translate.instant('form.email');
  if (errors['minlength']) {
    return translate.instant('form.minlength', { requiredLength: errors['minlength'].requiredLength });
  }
  if (errors['maxlength']) {
    return translate.instant('form.maxlength', { requiredLength: errors['maxlength'].requiredLength });
  }
  if (errors['min']) return translate.instant('form.min', { min: errors['min'].min });
  if (errors['max']) return translate.instant('form.max', { max: errors['max'].max });
  if (errors['pattern']) return translate.instant('form.pattern');
  return translate.instant('form.invalid');
}
