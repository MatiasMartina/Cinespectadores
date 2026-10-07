import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class PdfDocumentos {
  private http = inject(HttpClient);
  private fuente?: Promise<string>;
  private cargarFuente(): Promise<string> {
    if (!this.fuente)
      this.fuente = firstValueFrom(
        this.http.get(new URL('fonts/DejaVuSans.ttf', document.baseURI).toString(), {
          responseType: 'arraybuffer',
        }),
      )
        .then((buffer) => {
          const bytes = new Uint8Array(buffer);
          let texto = '';
          for (let i = 0; i < bytes.length; i += 32768)
            texto += String.fromCharCode(...bytes.subarray(i, i + 32768));
          return btoa(texto);
        })
        .catch((error) => {
          this.fuente = undefined;
          throw error;
        });
    return this.fuente;
  }
  async crear() {
    const [{ jsPDF }, fuente] = await Promise.all([import('jspdf'), this.cargarFuente()]);
    const pdf = new jsPDF({ putOnlyUsedFonts: true, compress: true });
    pdf.addFileToVFS('DejaVuSans.ttf', fuente);
    pdf.addFont('DejaVuSans.ttf', 'Cine', 'normal');
    pdf.setFont('Cine', 'normal');
    return pdf;
  }
}
