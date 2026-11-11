import { HttpClient } from "@angular/common/http";

export class VoltexApiService {
  
  // Escribe la URL completa directamente aquí:
  private apiUrl = 'https://volback-production.up.railway.app/api';

  constructor(private http: HttpClient) {}

}