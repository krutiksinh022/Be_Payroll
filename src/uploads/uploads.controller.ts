import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Multer } from 'multer';
import { AdminGuard } from '../users/admin.guard';
import { UploadsService } from './uploads.service';

@Controller('uploads')
@UseGuards(AdminGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get()
  async listUploads(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? Number.parseInt(page, 10) : 1;
    const limitNum = limit ? Number.parseInt(limit, 10) : 10;

    return this.uploadsService.findAll(pageNum, limitNum, {
      search,
      status,
    });
  }

  @Get('screen')
  @Header('Content-Type', 'text/html; charset=utf-8')
  renderUploadScreen() {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Employee Upload</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; background: #f6f8fb; color: #1f2937; }
      .card { background: white; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 16px; }
      .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin: 16px 0; }
      .stat { padding: 12px; background: #f9fafb; border-radius: 8px; }
      form { max-width: 480px; display: flex; flex-direction: column; gap: 12px; }
      input, button { padding: 10px; font-size: 14px; }
      pre { background: #111827; color: #f9fafb; padding: 12px; overflow-x: auto; border-radius: 8px; }
      table { width: 100%; border-collapse: collapse; background: white; }
      th, td { padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
      th { background: #f3f4f6; }
      .pill { display:inline-block; padding:4px 8px; border-radius:999px; font-size:12px; background:#eef2ff; color:#4338ca; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Employee CSV Upload</h1>
      <p>Upload a CSV file with employee_id, employee_name, amount, and pay_period columns.</p>
      <form id="uploadForm">
        <input type="text" id="token" placeholder="Admin bearer token" required />
        <input type="file" id="file" accept=".csv" required />
        <button type="submit">Upload CSV</button>
      </form>
      <pre id="result">Waiting for upload...</pre>
      <p>Sample file: <a href="/sample-employees.csv">sample-employees.csv</a></p>
    </div>

    <div class="card">
      <h2>Batch Status</h2>
      <div class="grid" id="summaryGrid"></div>
    </div>

    <div class="card">
      <h2>Recent Batches</h2>
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Total</th>
            <th>Successful</th>
            <th>Failed</th>
            <th>Dead Letter</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="batchRows"></tbody>
      </table>
    </div>

    <script>
      const form = document.getElementById('uploadForm');
      const result = document.getElementById('result');
      const summaryGrid = document.getElementById('summaryGrid');
      const batchRows = document.getElementById('batchRows');

      async function loadSummary() {
        try {
          const response = await fetch('/uploads/batch-summary');
          const data = await response.json();
          summaryGrid.innerHTML = [
            ['Total Records', data.total_records],
            ['Pending', data.pending],
            ['Processing', data.processing],
            ['Successful', data.successful],
            ['Failed', data.failed],
            ['Dead Letter', data.dead_letter],
          ].map(([label, value]) => \`<div class="stat"><strong>\${label}</strong><br>\${value}</div>\`).join('');
        } catch (error) {
          summaryGrid.innerHTML = '<div class="stat">Unable to load batch summary</div>';
        }
      }

      async function loadBatches() {
        try {
          const response = await fetch('/uploads/batch-list?page=1&limit=10');
          const data = await response.json();
          batchRows.innerHTML = (data.data || []).map((batch) => \`
            <tr>
              <td>\${batch.file_name}</td>
              <td>\${batch.total_records}</td>
              <td>\${batch.successful_count}</td>
              <td>\${batch.failed_count}</td>
              <td>\${batch.dead_letter_count}</td>
              <td><span class="pill">\${batch.status}</span></td>
            </tr>
          \`).join('');
        } catch (error) {
          batchRows.innerHTML = '<tr><td colspan="6">Unable to load batches</td></tr>';
        }
      }

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const token = document.getElementById('token').value.trim();
        const file = document.getElementById('file').files[0];
        if (!token || !file) {
          result.textContent = 'Please enter a bearer token and select a CSV file.';
          return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await fetch('/uploads', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token },
            body: formData,
          });
          const data = await response.json();
          result.textContent = JSON.stringify(data, null, 2);
          await loadSummary();
          await loadBatches();
        } catch (error) {
          result.textContent = 'Upload failed: ' + error.message;
        }
      });

      loadSummary();
      loadBatches();
    </script>
  </body>
</html>`;
  }

  @Get('batch-list')
  async listBatches(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.uploadsService.findBatches(
      Number(page ?? 1),
      Number(limit ?? 10),
      search,
    );
  }

  @Get('batch-summary')
  async getBatchSummary() {
    return this.uploadsService.getBatchSummary();
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadCsv(@UploadedFile() file: Multer.File) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are supported');
    }

    return this.uploadsService.createFromCsv(file.originalname, file.buffer);
  }
}
