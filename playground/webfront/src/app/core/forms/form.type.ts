import type { FormGroup } from '@angular/forms';

export interface FormType<Model, Payload = Partial<Model>, Form extends FormGroup = FormGroup> {
  createForm(model: Model | null): Form;
  reset(form: Form, model: Model | null): void;
  persist(form: Form): Payload;
}
