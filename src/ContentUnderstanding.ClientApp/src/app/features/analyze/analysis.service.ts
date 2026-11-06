import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

export interface AnalysisResult {
  fileName: string;
  analyzerId: string;
  fields: Record<string, unknown>;
  pageCount: number | null;
  durationMs: number;
}

export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'] as const;
export const MAX_FILE_SIZE_MB = 20;

export function validateFile(file: File): string | null {
  const lower = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return 'Only PDF, DOCX and TXT files are supported.';
  }
  if (file.size === 0) {
    return 'The file is empty.';
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `The file exceeds the ${MAX_FILE_SIZE_MB} MB limit.`;
  }
  return null;
}

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);

  analyze(file: File): Observable<AnalysisResult> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<AnalysisResult>('/api/analysis', form).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new Error(this.toMessage(error)))),
    );
  }

  private toMessage(error: HttpErrorResponse): string {
    const detail = (error.error as { detail?: string } | null)?.detail;
    if (detail) {
      return detail;
    }
    if (error.status === 401 || error.status === 403) {
      return 'You are not authorised to use this service.';
    }
    return 'The document could not be analysed. Please try again.';
  }
}
