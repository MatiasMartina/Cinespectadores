import { Component, ElementRef, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, filter, map } from 'rxjs';
import { Usuario } from '../../models/usuario';
import { Usuarios } from '../../services/usuarios';
import { Alertas } from '../../services/alertas';
import { SalidaCompra } from '../../services/salida-compra';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  host: {
    '(document:click)': 'cerrarMenuFuera($event)',
    '(document:keydown.escape)': 'cerrarMenuConEscape()',
  },
})
export class Navbar implements OnInit, OnDestroy {
  private usuariosService = inject(Usuarios);
  private router = inject(Router);
  private elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private salidaCompra = inject(SalidaCompra);
  alertas = inject(Alertas);
  private suscripcionUsuario?: Subscription;
  private suscripcionNavegacion?: Subscription;

  usuarioActual = signal<Usuario | undefined>(undefined);
  menuUsuarioAbierto = signal(false);
  inicialesUsuario = computed(() => {
    const usuario = this.usuarioActual();
    return (
      (usuario?.nombre.trim().charAt(0) ?? '') + (usuario?.apellido.trim().charAt(0) ?? '')
    ).toUpperCase();
  });

  // Se actualiza en cada navegación, así el returnUrl nunca queda viejo
  urlActual = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  urlDeRetorno = computed(() => {
    const actual = this.urlActual();
    const pagina = actual.split('?')[0];

    if (pagina !== '/inicio-sesion' && pagina !== '/registro') {
      return actual;
    }

    const retorno = this.router.parseUrl(actual).queryParams['returnUrl'];

    return typeof retorno === 'string' && retorno.startsWith('/') && !retorno.startsWith('//')
      ? retorno
      : '/';
  });

  ngOnInit(): void {
    this.suscripcionUsuario = this.usuariosService.usuarioActual$.subscribe((usuario) => {
      this.usuarioActual.set(usuario);
      this.cerrarMenu();
    });
    this.suscripcionNavegacion = this.router.events.subscribe((evento) => {
      if (evento instanceof NavigationEnd) this.cerrarMenu();
    });
  }

  alternarMenu(): void {
    this.menuUsuarioAbierto.update((abierto) => !abierto);
  }

  cerrarMenu(): void {
    this.menuUsuarioAbierto.set(false);
  }

  cerrarMenuFuera(evento: Event): void {
    if (
      this.menuUsuarioAbierto() &&
      evento.target instanceof Node &&
      !this.elemento.nativeElement.querySelector('.cuenta-usuario')?.contains(evento.target)
    ) {
      this.cerrarMenu();
    }
  }

  cerrarMenuAlSalir(evento: FocusEvent): void {
    if (
      evento.relatedTarget instanceof Node &&
      !this.elemento.nativeElement.querySelector('.cuenta-usuario')?.contains(evento.relatedTarget)
    ) {
      this.cerrarMenu();
    }
  }

  cerrarMenuConEscape(): void {
    if (!this.menuUsuarioAbierto()) return;
    this.cerrarMenu();
    this.elemento.nativeElement.querySelector<HTMLButtonElement>('.boton-usuario')?.focus();
  }

  async cerrarSesion(): Promise<void> {
    if (!this.salidaCompra.confirmarSalida()) return;
    this.cerrarMenu();
    const cerrada = await this.usuariosService.cerrarSesion();
    if (!cerrada) {
      alert('No se pudo cerrar sesión. Intentá nuevamente.');
      return;
    }
    this.salidaCompra.descartarCompra();
    await this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    this.suscripcionUsuario?.unsubscribe();
    this.suscripcionNavegacion?.unsubscribe();
  }
}
