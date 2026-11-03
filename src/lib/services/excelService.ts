import ExcelJS from 'exceljs';
import { EventWithHeatmap } from '@/types';

export async function generateEventExcel(data: EventWithHeatmap): Promise<Buffer> {
  const { event, participants, timeSlots, heatmap } = data;
  const totalParticipants = participants.length;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HorarioGrupal';
  workbook.created = new Date();

  // -------------------------------------------------------------
  // HOJA 1: MAPA DE CALOR (Cuadrícula Visual)
  // -------------------------------------------------------------
  const wsHeatmap = workbook.addWorksheet('Mapa de Calor', {
    views: [{ showGridLines: true }],
  });

  // Título y Metadatos
  wsHeatmap.addRow([]);
  const titleRow = wsHeatmap.addRow(['', event.title]);
  titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1E293B' } };

  const subtitleText = [
    event.description ? `${event.description} • ` : '',
    `${totalParticipants} participante${totalParticipants === 1 ? '' : 's'} • `,
    `Intervalos de ${event.slotDuration} min • `,
    `Generado el ${new Date().toLocaleDateString('es-ES')}`
  ].join('');

  const subtitleRow = wsHeatmap.addRow(['', subtitleText]);
  subtitleRow.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  wsHeatmap.addRow([]); // Espaciador

  // Encabezados de la Cuadrícula
  const headerCols = ['Hora', ...event.dates];
  const gridHeaderRow = wsHeatmap.addRow(headerCols);
  gridHeaderRow.height = 26;

  gridHeaderRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colNumber === 1 ? 'FF334155' : 'FF4F46E5' },
    };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF1E293B' } },
      bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // Filas de Franjas Horarias
  timeSlots.forEach((time) => {
    const rowValues: (string | number)[] = [time];

    event.dates.forEach((date) => {
      const slotKey = `${date}_${time}`;
      const slot = heatmap[slotKey];
      if (totalParticipants > 0 && slot && slot.availableCount > 0) {
        const pct = Math.round(slot.ratio * 100);
        if (slot.availableCount === totalParticipants) {
          rowValues.push(`${slot.availableCount}/${totalParticipants} (100% ⭐)`);
        } else {
          rowValues.push(`${slot.availableCount}/${totalParticipants} (${pct}%)`);
        }
      } else {
        rowValues.push('-');
      }
    });

    const dataRow = wsHeatmap.addRow(rowValues);
    dataRow.height = 22;

    dataRow.eachCell((cell, colNumber) => {
      // Columna 1: Hora
      if (colNumber === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' },
        };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF334155' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FF94A3B8' } },
          right: { style: 'medium', color: { argb: 'FF94A3B8' } },
        };
        return;
      }

      // Columnas de Fechas
      const dateIndex = colNumber - 2;
      const date = event.dates[dateIndex];
      const slotKey = `${date}_${time}`;
      const slot = heatmap[slotKey];

      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      if (!slot || totalParticipants === 0 || slot.availableCount === 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF94A3B8' } };
      } else {
        const ratio = slot.ratio;
        if (slot.availableCount === totalParticipants) {
          // 100% de disponibilidad
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF059669' }, // Verde esmeralda intenso
          };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        } else if (ratio >= 0.75) {
          // 75%+
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF34D399' },
          };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF064E3B' } };
        } else if (ratio >= 0.5) {
          // 50%+
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFA7F3D0' },
          };
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF064E3B' } };
        } else if (ratio >= 0.25) {
          // 25%+
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD1FAE5' },
          };
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF064E3B' } };
        } else {
          // <25%
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFECFDF5' },
          };
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF064E3B' } };
        }
      }
    });
  });

  // Ajustar ancho de columnas en Mapa de Calor
  wsHeatmap.getColumn(1).width = 12; // Hora
  for (let i = 2; i <= headerCols.length; i++) {
    wsHeatmap.getColumn(i).width = 18; // Fechas
  }

  // -------------------------------------------------------------
  // HOJA 2: DETALLE POR FRANJA HORARIA
  // -------------------------------------------------------------
  const wsDetail = workbook.addWorksheet('Detalle de Horarios', {
    views: [{ showGridLines: true }],
  });

  const detailHeaderRow = wsDetail.addRow([
    'Fecha / Día',
    'Hora',
    'Disponibles',
    'Total Personas',
    '% Coincidencia',
    'Nombres de Disponibles',
    'Nombres de No Disponibles'
  ]);
  detailHeaderRow.height = 24;

  detailHeaderRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  event.dates.forEach((date) => {
    timeSlots.forEach((time) => {
      const slotKey = `${date}_${time}`;
      const slot = heatmap[slotKey];
      const count = slot?.availableCount || 0;
      const pct = slot ? Math.round(slot.ratio * 100) : 0;
      const availableNames = slot?.availableNames.join(', ') || '(Ninguno)';
      const unavailableNames = slot?.unavailableNames.join(', ') || '(Ninguno)';

      const row = wsDetail.addRow([
        date,
        time,
        count,
        totalParticipants,
        `${pct}%`,
        availableNames,
        unavailableNames,
      ]);
      row.height = 20;

      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(7).alignment = { vertical: 'middle', horizontal: 'left' };

      // Resaltar celdas con alta coincidencia
      if (totalParticipants > 0 && count === totalParticipants) {
        row.getCell(5).font = { bold: true, color: { argb: 'FF059669' } };
        row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
      }
    });
  });

  wsDetail.getColumn(1).width = 16;
  wsDetail.getColumn(2).width = 12;
  wsDetail.getColumn(3).width = 14;
  wsDetail.getColumn(4).width = 16;
  wsDetail.getColumn(5).width = 16;
  wsDetail.getColumn(6).width = 38;
  wsDetail.getColumn(7).width = 38;

  // -------------------------------------------------------------
  // HOJA 3: LISTA DE PARTICIPANTES
  // -------------------------------------------------------------
  const wsParticipants = workbook.addWorksheet('Participantes', {
    views: [{ showGridLines: true }],
  });

  const partHeaderRow = wsParticipants.addRow([
    '#',
    'Nombre o Alias',
    'Bloques Libres Marcados',
    'Horas Libres Estimadas',
    'Última Modificación'
  ]);
  partHeaderRow.height = 24;

  partHeaderRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4338CA' },
    };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  participants.forEach((p, idx) => {
    const hours = (p.slots.length * (event.slotDuration / 60)).toFixed(1);
    const dateFormatted = p.updatedAt ? new Date(p.updatedAt).toLocaleString('es-ES') : '-';

    const row = wsParticipants.addRow([
      idx + 1,
      p.name,
      p.slots.length,
      `${hours} h`,
      dateFormatted
    ]);
    row.height = 20;

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  wsParticipants.getColumn(1).width = 6;
  wsParticipants.getColumn(2).width = 28;
  wsParticipants.getColumn(3).width = 24;
  wsParticipants.getColumn(4).width = 22;
  wsParticipants.getColumn(5).width = 24;

  const rawBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(rawBuffer);
}
