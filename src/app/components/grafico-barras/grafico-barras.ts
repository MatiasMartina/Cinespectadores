import { Component, computed, input } from '@angular/core';
@Component({ selector: 'app-grafico-barras', templateUrl: './grafico-barras.html' })
export class GraficoBarras {
  datos = input.required<{ nombre: string; valor: number }[]>();
  unidad = input('unidades');
  maximo = computed(() => Math.max(1, ...this.datos().map((d) => d.valor)));
}
