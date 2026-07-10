import { Component, inject, OnInit, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';



@Component({

  selector: 'app-login',

  imports: [ReactiveFormsModule],

  templateUrl: './login.component.html',

  styleUrl: './login.component.scss',

})

export class LoginComponent implements OnInit {

  private readonly fb = inject(FormBuilder);

  private readonly auth = inject(AuthService);

  private readonly router = inject(Router);



  protected readonly isLoading = signal(false);

  protected readonly showPassword = signal(false);

  protected readonly errorMessage = signal<string | null>(null);



  protected readonly form = this.fb.nonNullable.group({

    usuario: ['', [Validators.required, Validators.minLength(3)]],

    password: ['', [Validators.required, Validators.minLength(4)]],

    remember: [true],

  });



  ngOnInit(): void {
    const expiredMessage = this.auth.consumeSessionExpiredMessage();
    if (expiredMessage) {
      this.errorMessage.set(expiredMessage);
    }

    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }



  protected togglePassword(): void {

    this.showPassword.update((v) => !v);

  }



  protected onSubmit(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;

    }



    this.isLoading.set(true);

    this.errorMessage.set(null);



    const { usuario, password } = this.form.getRawValue();



    this.auth.login({ usuario, password }).subscribe({

      next: () => {

        this.isLoading.set(false);

        this.router.navigate(['/dashboard']);

      },

      error: (err: Error) => {

        this.isLoading.set(false);

        this.errorMessage.set(err.message ?? 'Error al iniciar sesión.');

      },

    });

  }

}


