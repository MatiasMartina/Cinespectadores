import { inject, Injectable } from '@angular/core';
import { PdfDocumentos } from './pdf-documentos';
import type { jsPDF } from 'jspdf';
import { Entrada } from '../models/entrada';

@Injectable({
  providedIn: 'root',
})
export class Entradas {
  private documentos = inject(PdfDocumentos);

  async descargarEntrada(entrada: Entrada): Promise<void> {
    const [pdf, { default: QRCode }] = await Promise.all([
      this.documentos.crear(),
      import('qrcode'),
    ]);
    const informacionQr = entrada.codigo;

    const imagenQr = await QRCode.toDataURL(informacionQr, {
      width: 600,
      margin: 2,
    });

    this.agregarEncabezado(pdf);
    const butacasExtensas = this.agregarDatosEntrada(pdf, entrada);
    this.agregarQr(pdf, entrada, imagenQr);
    this.agregarCandyBar(pdf, entrada);
    if (butacasExtensas) {
      pdf.addPage();
      pdf.setFontSize(15);
      pdf.text('DETALLE DE BUTACAS', 20, 25);
      pdf.setFontSize(10);
      const lineas: string[] = pdf.splitTextToSize(entrada.butacas.join(', '), 170);
      lineas.forEach((linea, i) => {
        if (i > 0 && i % 48 === 0) pdf.addPage();
        pdf.text(linea, 20, 40 + (i % 48) * 5);
      });
    }

    pdf.save(`entrada-${entrada.codigo}.pdf`);
  }

  private agregarEncabezado(pdf: jsPDF): void {
    pdf.setFillColor(18, 18, 28);
    pdf.rect(0, 0, 210, 43, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.text('CINE SPECTADORES', 20, 21);

    pdf.setFontSize(11);
    pdf.text('ENTRADA DIGITAL', 20, 31);
  }

  private agregarDatosEntrada(pdf: jsPDF, entrada: Entrada): boolean {
    pdf.setTextColor(30, 30, 30);

    pdf.setFontSize(17);
    const titulo = pdf.splitTextToSize(entrada.pelicula, 98);
    pdf.text(titulo, 20, 56);

    pdf.setFontSize(11);
    pdf.text(`Fecha: ${entrada.fecha}`, 20, 78);
    pdf.text(`Horario: ${entrada.hora} hs`, 20, 87);
    pdf.text(`Sala: ${entrada.salaNumero}`, 20, 96);
    pdf.text(`Formato: ${entrada.formato}`, 20, 105);
    pdf.text(`Idioma: ${entrada.idioma}`, 20, 114);

    const butacas = pdf.splitTextToSize(`Butacas: ${entrada.butacas.join(', ')}`, 98);
    pdf.text(
      butacas.length > 4 ? `Butacas: ${entrada.butacas.length} (ver detalle de butacas)` : butacas,
      20,
      125,
    );

    pdf.setFontSize(13);
    pdf.text(`Total pagado: $${entrada.total.toLocaleString('es-AR')}`, 20, 145);
    return butacas.length > 4;
  }

  private agregarQr(pdf: jsPDF, entrada: Entrada, imagenQr: string): void {
    pdf.addImage(imagenQr, 'PNG', 130, 54, 60, 60);

    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(9);

    pdf.text(pdf.splitTextToSize(`Código: ${entrada.codigo}`, 60), 160, 124, { align: 'center' });

    pdf.text('Presentá este QR en el cine.', 160, 139, { align: 'center' });
  }

  private agregarCandyBar(pdf: jsPDF, entrada: Entrada): void {
    pdf.setDrawColor(190, 190, 200);
    pdf.line(20, 154, 190, 154);

    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(15);
    pdf.text('CANDY BAR', 20, 166);
    if ((entrada.edadMinima ?? 0) > 0) {
      pdf.setFontSize(9);
      pdf.text(`Clasificación +${entrada.edadMinima}. Debe asistir un adulto.`, 20, 151);
    }

    if (entrada.productosCandy.length === 0) {
      pdf.setFontSize(10);
      pdf.text('No agregaste productos a esta compra.', 20, 179);
      return;
    }

    let posicionY = 178;
    for (let indice = 0; indice < entrada.productosCandy.length; indice += 2) {
      pdf.setFontSize(9);
      const pares = entrada.productosCandy.slice(indice, indice + 2);
      const nombres = pares.map(
        (item) => pdf.splitTextToSize(`${item.cantidad} x ${item.nombre}`, 60) as string[],
      );
      const alto = Math.max(10, ...nombres.map((lineas) => lineas.length * 4 + 3));
      if (posicionY + alto > 265) {
        pdf.addPage();
        pdf.setFontSize(15);
        pdf.text('CANDY BAR (continuación)', 20, 25);
        posicionY = 39;
        pdf.setFontSize(9);
      }
      pares.forEach((item, columna) => {
        pdf.text(nombres[columna], columna === 0 ? 20 : 110, posicionY);
        pdf.text(
          `$${item.subtotal.toLocaleString('es-AR')}`,
          columna === 0 ? 100 : 190,
          posicionY,
          { align: 'right' },
        );
      });
      posicionY += alto;
    }

    const subtotalCandy = entrada.productosCandy.reduce((total, item) => total + item.subtotal, 0);

    if (posicionY + 23 > 282) {
      pdf.addPage();
      posicionY = 30;
    }
    const posicionSubtotal = posicionY + 3;

    pdf.line(20, posicionSubtotal - 8, 190, posicionSubtotal - 8);

    pdf.setFontSize(12);
    pdf.text('Valor Candy sin beneficios', 20, posicionSubtotal);

    pdf.text(`$${subtotalCandy.toLocaleString('es-AR')}`, 190, posicionSubtotal, {
      align: 'right',
    });

    pdf.setFontSize(9);
    pdf.text('Combo, canjes y descuentos incluidos en el total pagado.', 20, posicionSubtotal + 13);
  }
}
