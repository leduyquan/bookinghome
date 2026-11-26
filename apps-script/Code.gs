/**
 * Booking Home — Apps Script gắn vào Google Sheet.
 * Mỗi kỳ là một tab. Google Sheet không cho dấu / trong tên tab,
 * nên đặt tên 11.11.2026-10.01.2027 (web vẫn hiện 11/11/2026 - 10/01/2027).
 *
 * Bố cục một tab:
 * A–M  Chi tiết
 * N    trống
 * O–S  Chi phí
 * T    trống
 * U–Z  Doanh thu (script ghi lại)
 * AA   trống
 * AB+  Lịch OCC (script vẽ lại)
 *
 * Script properties: APP_PASSWORD = quanduy123
 * Deploy: Web app, Execute as Me, Who has access: Anyone.
 */
var DETAIL_COL = 1
var EXPENSE_COL = 15
var REVENUE_COL = 21
var CALENDAR_COL = 28
var ROOMS = {
  '201': { type: '2 BED', header: '#556B45', cell: '#D5DCC6', ink: '#2A3522' },
  '202': { type: '1 BED', header: '#A3542E', cell: '#F4D4C0', ink: '#633216' },
  '301': { type: '1 BED', header: '#7A614A', cell: '#EADDCB', ink: '#3C3126' },
}
var SOURCE_OK = { '': true, BDC: true, Agoda: true, 'Air bnb': true, 'Khách lẻ': true }
var WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

function doGet() {
  return json_({ ok: true, service: 'bookinghome' })
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return json_({ ok: false, error: 'Thiếu nội dung yêu cầu' })
    return json_(handle_(JSON.parse(e.postData.contents)))
  } catch (err) {
    Logger.log(err)
    return json_({ ok: false, error: err && err.message ? String(err.message) : String(err) })
  }
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Booking Home').addItem('Khởi tạo tiêu đề kỳ này', 'initActiveSheet').addToUi()
}

function initActiveSheet() {
  var sheet = SpreadsheetApp.getActiveSheet()
  if (!parsePeriodName_(sheet.getName())) {
    SpreadsheetApp.getUi().alert('Đổi tên tab thành dạng 11.11.2026-10.01.2027 rồi chạy lại.')
    return
  }
  var data = readPeriod_(sheet.getName(), true)
  SpreadsheetApp.getUi().alert('Đã khởi tạo. Booking: ' + data.bookings.length + ', chi phí: ' + data.expenses.length + '.')
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}

function handle_(body) {
  var expected = PropertiesService.getScriptProperties().getProperty('APP_PASSWORD')
  if (!expected) return { ok: false, error: 'Chưa cấu hình APP_PASSWORD trong Script properties' }
  if (!body || body.password !== expected) return { ok: false, error: 'UNAUTHORIZED' }

  if (body.action === 'login') return { ok: true }
  if (body.action === 'listPeriods') return { ok: true, periods: listPeriods_() }
  if (body.action === 'getPeriod') return okData_(readPeriod_(body.sheetName, false))
  if (body.action === 'saveBooking') return okData_(saveBooking_(body.sheetName, body.booking || {}))
  if (body.action === 'deleteBooking') return okData_(deleteBooking_(body.sheetName, body.id))
  if (body.action === 'saveExpense') return okData_(saveExpense_(body.sheetName, body.expense || {}))
  if (body.action === 'deleteExpense') return okData_(deleteExpense_(body.sheetName, body.id))
  return { ok: false, error: 'Hành động không hợp lệ' }
}

function okData_(data) {
  return { ok: true, bookings: data.bookings, expenses: data.expenses, revenue: data.revenue }
}

function listPeriods_() {
  return SpreadsheetApp.getActiveSpreadsheet()
    .getSheets()
    .map(function (sheet) {
      return parsePeriodName_(sheet.getName())
    })
    .filter(function (period) {
      return Boolean(period)
    })
    .sort(function (a, b) {
      return a.start < b.start ? -1 : a.start > b.start ? 1 : 0
    })
}

function readPeriod_(sheetName, refresh) {
  var sheet = openPeriod_(sheetName)
  var period = parsePeriodName_(sheetName)
  var bookings = readBookings_(sheet)
  var expenses = readExpenses_(sheet)
  var revenue = computeRevenue_(bookings, expenses)
  if (refresh) {
    writeRevenue_(sheet, revenue)
    redrawCalendar_(sheet, period, bookings)
  }
  return { bookings: bookings, expenses: expenses, revenue: revenue }
}

function saveBooking_(sheetName, input) {
  var sheet = openPeriod_(sheetName)
  var period = parsePeriodName_(sheetName)
  var bookings = readBookings_(sheet)
  var expenses = readExpenses_(sheet)
  var id = input.id ? String(input.id) : Utilities.getUuid()
  if (input.id && !hasId_(bookings, id)) throw new Error('Không tìm thấy booking')
  var next = normalizeBooking_(input, period, bookings, id)
  var replaced = false
  var updated = bookings.map(function (booking) {
    if (booking.id !== id) return booking
    replaced = true
    return next
  })
  if (!replaced) updated.push(next)
  updated.sort(compareBookings_)
  writeBookings_(sheet, updated)
  var revenue = computeRevenue_(updated, expenses)
  writeRevenue_(sheet, revenue)
  redrawCalendar_(sheet, period, updated)
  return { bookings: updated, expenses: expenses, revenue: revenue }
}

function deleteBooking_(sheetName, id) {
  var sheet = openPeriod_(sheetName)
  var period = parsePeriodName_(sheetName)
  var bookings = readBookings_(sheet).filter(function (booking) {
    return booking.id !== String(id || '')
  })
  if (bookings.length === readBookings_(sheet).length) throw new Error('Không tìm thấy booking')
  var expenses = readExpenses_(sheet)
  writeBookings_(sheet, bookings)
  var revenue = computeRevenue_(bookings, expenses)
  writeRevenue_(sheet, revenue)
  redrawCalendar_(sheet, period, bookings)
  return { bookings: bookings, expenses: expenses, revenue: revenue }
}

function saveExpense_(sheetName, input) {
  var sheet = openPeriod_(sheetName)
  var period = parsePeriodName_(sheetName)
  var bookings = readBookings_(sheet)
  var expenses = readExpenses_(sheet)
  var id = input.id ? String(input.id) : Utilities.getUuid()
  if (input.id && !hasId_(expenses, id)) throw new Error('Không tìm thấy chi phí')
  var next = normalizeExpense_(input, period, id)
  var replaced = false
  var updated = expenses.map(function (expense) {
    if (expense.id !== id) return expense
    replaced = true
    return next
  })
  if (!replaced) updated.push(next)
  updated.sort(function (a, b) {
    return a.date < b.date ? -1 : a.date > b.date ? 1 : a.name.localeCompare(b.name)
  })
  writeExpenses_(sheet, updated)
  var revenue = computeRevenue_(bookings, updated)
  writeRevenue_(sheet, revenue)
  return { bookings: bookings, expenses: updated, revenue: revenue }
}

function deleteExpense_(sheetName, id) {
  var sheet = openPeriod_(sheetName)
  var bookings = readBookings_(sheet)
  var current = readExpenses_(sheet)
  var expenses = current.filter(function (expense) {
    return expense.id !== String(id || '')
  })
  if (expenses.length === current.length) throw new Error('Không tìm thấy chi phí')
  writeExpenses_(sheet, expenses)
  var revenue = computeRevenue_(bookings, expenses)
  writeRevenue_(sheet, revenue)
  return { bookings: bookings, expenses: expenses, revenue: revenue }
}

function openPeriod_(sheetName) {
  var period = parsePeriodName_(sheetName)
  if (!period) throw new Error('Tên sheet không đúng định dạng 11.11.2026-10.01.2027')
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(period.sheetName)
  if (!sheet) throw new Error('Không tìm thấy kỳ')
  ensureHeaders_(sheet)
  return sheet
}

function ensureHeaders_(sheet) {
  if (!sheet.getRange(1, DETAIL_COL).getValue()) {
    writeDetailHeader_(sheet)
    sheet.getRange('D:E').setNumberFormat('@')
  }
  if (!sheet.getRange(1, EXPENSE_COL).getValue()) {
    sheet
      .getRange(1, EXPENSE_COL, 1, 5)
      .setValues([['id', 'Chi phí', 'Chi tiết', 'Ngày chi', 'Số tiền']])
      .setFontWeight('bold')
      .setFontColor('#ffffff')
      .setBackground('#244D74')
    sheet.getRange(1, EXPENSE_COL + 3, sheet.getMaxRows(), 1).setNumberFormat('@')
  }
}

function detailIsLegacy_(sheet) {
  return String(sheet.getRange(1, DETAIL_COL + 11).getValue()) === 'Ghi chú'
}

function isPaidLabel_(value) {
  return value === true || value === 'Yes' || value === 'Đã thanh toán'
}

function readBookings_(sheet) {
  var legacy = detailIsLegacy_(sheet)
  return readRows_(sheet, DETAIL_COL, legacy ? 12 : 13).map(function (row) {
    return {
      id: String(row[0]),
      source: String(row[1] || ''),
      guestName: String(row[2] || ''),
      checkIn: asIso_(row[3]),
      checkOut: asIso_(row[4]),
      room: String(row[5] || ''),
      nights: Number(row[6]) || 0,
      pricePerNight: Number(row[7]) || 0,
      total: Number(row[8]) || 0,
      cost: Number(row[9]) || 0,
      net: Number(row[10]) || 0,
      paid: legacy ? false : isPaidLabel_(row[11]),
      note: String((legacy ? row[11] : row[12]) || ''),
    }
  })
}

function readExpenses_(sheet) {
  return readRows_(sheet, EXPENSE_COL, 5).map(function (row) {
    return {
      id: String(row[0]),
      name: String(row[1] || ''),
      detail: String(row[2] || ''),
      date: asIso_(row[3]),
      amount: Number(row[4]) || 0,
    }
  })
}

function readRows_(sheet, column, width) {
  var last = sheet.getLastRow()
  if (last < 2) return []
  return sheet
    .getRange(2, column, last - 1, width)
    .getValues()
    .filter(function (row) {
      return String(row[0] || '').trim() !== ''
    })
}

function writeDetailHeader_(sheet) {
  sheet
    .getRange(1, DETAIL_COL, 1, 13)
    .setValues([['id', 'Nguồn', 'Tên khách', 'Check-in', 'Check-out', 'Phòng', 'Số đêm', 'Giá bán', 'Tổng cộng', 'Chi phí', 'Giá thu', 'Thanh toán', 'Ghi chú']])
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#244D74')
  sheet.setFrozenRows(1)
}

function writeBookings_(sheet, bookings) {
  writeDetailHeader_(sheet)
  clearBody_(sheet, DETAIL_COL, 13)
  if (!bookings.length) return
  sheet.getRange(2, DETAIL_COL, bookings.length, 13).setValues(
    bookings.map(function (booking) {
      return [
        booking.id,
        booking.source,
        safeText_(booking.guestName),
        booking.checkIn,
        booking.checkOut,
        booking.room,
        booking.nights,
        booking.pricePerNight,
        booking.total,
        booking.cost,
        booking.net,
        booking.paid ? 'Yes' : 'No',
        safeText_(booking.note),
      ]
    }),
  )
}

function writeExpenses_(sheet, expenses) {
  clearBody_(sheet, EXPENSE_COL, 5)
  if (!expenses.length) return
  sheet.getRange(2, EXPENSE_COL, expenses.length, 5).setValues(
    expenses.map(function (expense) {
      return [expense.id, safeText_(expense.name), safeText_(expense.detail), expense.date, expense.amount]
    }),
  )
}

function clearBody_(sheet, column, width) {
  var last = Math.max(sheet.getLastRow(), 2)
  sheet.getRange(2, column, Math.max(last - 1, 1), width).clearContent()
}

function writeRevenue_(sheet, revenue) {
  sheet
    .getRange(1, REVENUE_COL, 1, 6)
    .setValues([['Doanh thu', 'Doanh thu ước tính', 'Chi phí', 'Lợi nhuận', 'Quân Duy (50%)', 'Thùy (50%)']])
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#244D74')
  sheet
    .getRange(2, REVENUE_COL, 1, 6)
    .setValues([[revenue.doanhThu, revenue.doanhThuUocTinh, revenue.chiPhi, revenue.loiNhuan, revenue.quanDuy, revenue.thuy]])
    .setNumberFormat('#,##0')
}

function redrawCalendar_(sheet, period, bookings) {
  var weeks = weeksCovering_(period.start, period.end)
  var width = 9
  var usedRows = Math.max(weeks.length * 6, 1)
  var area = sheet.getRange(1, CALENDAR_COL, usedRows + 12, width)
  area.breakApart()
  area.clear()

  function filled(value) {
    var row = []
    for (var index = 0; index < width; index += 1) row.push(value)
    return row
  }

  var values = []
  var backgrounds = []
  var fontColors = []
  var fontWeights = []
  var aligns = []
  var stays = []
  var roomBands = []
  var titles = []

  groupWeeks_(weeks).forEach(function (block) {
    var firstDay = block[0][0].iso
    var lastWeek = block[block.length - 1]
    var lastDay = lastWeek[lastWeek.length - 1].iso
    values.push(filled(shortDay_(firstDay) + ' – ' + shortDay_(lastDay)))
    backgrounds.push(filled('#244D74'))
    fontColors.push(filled('#ffffff'))
    fontWeights.push(filled('bold'))
    aligns.push(filled('center'))
    titles.push(values.length)

    values.push(['Room', 'Type'].concat(WEEKDAYS))
    backgrounds.push(filled('#244D74'))
    fontColors.push(filled('#ffffff'))
    fontWeights.push(filled('bold'))
    aligns.push(filled('center'))

    block.forEach(function (week) {
    var dates = ['', '']
    var dateBg = ['#F5F5F5', '#F5F5F5']
    var dateInk = ['#000000', '#000000']
    week.forEach(function (day) {
      dates.push(shortDay_(day.iso))
      dateBg.push('#E9EDF1')
      dateInk.push(day.inPeriod ? '#000000' : '#a8a29e')
    })
    values.push(dates)
    backgrounds.push(dateBg)
    fontColors.push(dateInk)
    fontWeights.push(filled('normal'))
    aligns.push(filled('center'))

    var bandStart = values.length + 1
    ;['201', '202', '301'].forEach(function (roomId) {
      var meta = ROOMS[roomId]
      var rowValues = filled('')
      var rowBg = filled('#ffffff')
      var rowInk = filled('#000000')
      var rowWeight = filled('normal')
      var rowAlign = filled('left')
      rowValues[0] = roomId
      rowValues[1] = meta.type
      rowBg[0] = meta.header
      rowBg[1] = meta.header
      rowInk[0] = '#ffffff'
      rowInk[1] = '#ffffff'
      rowWeight[0] = 'bold'
      rowAlign[0] = 'center'
      rowAlign[1] = 'center'

      var column = 2
      cellsForRoom_(week, bookings, roomId).forEach(function (cell) {
        var span = cell.span || 1
        if (cell.kind === 'outside') {
          for (var offset = 0; offset < span; offset += 1) rowBg[column + offset] = '#F5F5F5'
        } else if (cell.kind === 'stay') {
          var text = cell.booking.guestName
          if (cell.booking.note) text += '\n' + cell.booking.note
          rowValues[column] = safeText_(text)
          rowAlign[column] = 'center'
          for (var stayOffset = 0; stayOffset < span; stayOffset += 1) {
            rowBg[column + stayOffset] = meta.cell
            rowInk[column + stayOffset] = meta.ink
          }
          stays.push({ row: values.length + 1, column: CALENDAR_COL + column, span: span })
        }
        column += span
      })

      values.push(rowValues)
      backgrounds.push(rowBg)
      fontColors.push(rowInk)
      fontWeights.push(rowWeight)
      aligns.push(rowAlign)
    })
    roomBands.push(bandStart)
    })

    values.push(filled(''))
    backgrounds.push(filled('#ffffff'))
    fontColors.push(filled('#000000'))
    fontWeights.push(filled('normal'))
    aligns.push(filled('left'))
  })

  if (values.length) {
    var body = sheet.getRange(1, CALENDAR_COL, values.length, width)
    body.setValues(values)
    body.setBackgrounds(backgrounds)
    body.setFontColors(fontColors)
    body.setFontWeights(fontWeights)
    body.setHorizontalAlignments(aligns)
  }

  titles.forEach(function (row) {
    sheet.getRange(row, CALENDAR_COL, 1, width).merge().setHorizontalAlignment('center').setVerticalAlignment('middle')
  })
  stays.forEach(function (stay) {
    var target = sheet.getRange(stay.row, stay.column, 1, stay.span)
    if (stay.span > 1) target.merge()
    target.setWrap(true).setHorizontalAlignment('center').setVerticalAlignment('middle')
  })
  roomBands.forEach(function (row) {
    sheet.getRange(row, CALENDAR_COL + 2, 3, 7).setBorder(true, true, true, true, true, true, '#d6d3d1', SpreadsheetApp.BorderStyle.SOLID)
    sheet.setRowHeights(row, 3, 28)
  })

  sheet.setColumnWidth(CALENDAR_COL, 70)
  sheet.setColumnWidth(CALENDAR_COL + 1, 80)
  for (var index = 2; index < width; index += 1) sheet.setColumnWidth(CALENDAR_COL + index, 120)
}

function normalizeBooking_(input, period, existing, id) {
  var guestName = String(input.guestName || '').trim()
  var source = String(input.source || '')
  var room = String(input.room || '')
  var checkIn = String(input.checkIn || '')
  var checkOut = String(input.checkOut || '')
  if (!guestName) throw new Error('Nhập tên khách')
  if (!SOURCE_OK[source] && source !== '') throw new Error('Nguồn không hợp lệ')
  if (!Object.prototype.hasOwnProperty.call(SOURCE_OK, source)) throw new Error('Nguồn không hợp lệ')
  if (!ROOMS[room]) throw new Error('Chọn phòng')
  if (!isWithin_(checkIn, period) || !isWithin_(checkOut, period)) throw new Error('Ngày nhận và trả phòng phải nằm trong kỳ đang mở')
  if (checkOut <= checkIn) throw new Error('Ngày trả phòng phải sau ngày nhận')
  var total = asInt_(input.total, 'Tổng giá phải là số nguyên lớn hơn 0', 1)
  var cost = asInt_(input.cost, 'Chi phí phải là số nguyên không âm', 0)
  var clash = findOverlap_(existing, room, checkIn, checkOut, input.id ? String(input.id) : '')
  if (clash) throw new Error('Phòng ' + room + ' đã có ' + clash.guestName + ' trong các đêm này')
  var nights = nightsBetween_(checkIn, checkOut)
  return {
    id: id,
    source: source,
    guestName: guestName,
    checkIn: checkIn,
    checkOut: checkOut,
    room: room,
    nights: nights,
    pricePerNight: Math.round(total / nights),
    total: total,
    cost: cost,
    net: total - cost,
    paid: isPaidLabel_(input.paid),
    note: String(input.note || '').trim(),
  }
}

function normalizeExpense_(input, period, id) {
  var name = String(input.name || '').trim()
  var date = String(input.date || '')
  if (!name) throw new Error('Nhập tên chi phí')
  if (!isWithin_(date, period)) throw new Error('Ngày chi phải nằm trong kỳ đang mở')
  return {
    id: id,
    name: name,
    detail: String(input.detail || '').trim(),
    date: date,
    amount: asInt_(input.amount, 'Số tiền phải là số nguyên không âm', 0),
  }
}

function findOverlap_(bookings, room, checkIn, checkOut, excludeId) {
  for (var index = 0; index < bookings.length; index += 1) {
    var booking = bookings[index]
    if (booking.room === room && booking.id !== excludeId && checkIn < booking.checkOut && booking.checkIn < checkOut) return booking
  }
  return null
}

function computeRevenue_(bookings, expenses) {
  var doanhThu = 0
  var doanhThuUocTinh = 0
  var chiPhi = 0
  bookings.forEach(function (booking) {
    var net = Number(booking.net) || 0
    doanhThuUocTinh += net
    if (booking.paid) doanhThu += net
  })
  expenses.forEach(function (expense) {
    chiPhi += Number(expense.amount) || 0
  })
  var loiNhuan = doanhThu - chiPhi
  var quanDuy = Math.round(loiNhuan / 2)
  return {
    doanhThu: doanhThu,
    doanhThuUocTinh: doanhThuUocTinh,
    chiPhi: chiPhi,
    loiNhuan: loiNhuan,
    quanDuy: quanDuy,
    thuy: loiNhuan - quanDuy,
  }
}

function groupWeeks_(weeks) {
  var size = 4
  var groups = []
  for (var index = 0; index < weeks.length; index += size) groups.push(weeks.slice(index, index + size))
  if (groups.length > 1 && groups[groups.length - 1].length === 1) {
    var tail = groups.pop()
    groups[groups.length - 1] = groups[groups.length - 1].concat(tail)
  }
  return groups
}

function shortDay_(iso) {
  return iso.slice(8, 10) + '/' + iso.slice(5, 7)
}

function weeksCovering_(start, end) {
  var cursor = startOfMonday_(start)
  var last = isoOf_(startOfMonday_(end))
  var weeks = []
  while (isoOf_(cursor) <= last) {
    var days = []
    for (var index = 0; index < 7; index += 1) {
      var day = new Date(cursor.getTime())
      day.setDate(cursor.getDate() + index)
      var iso = isoOf_(day)
      days.push({ iso: iso, inPeriod: iso >= start && iso <= end })
    }
    weeks.push(days)
    cursor.setDate(cursor.getDate() + 7)
  }
  return weeks
}

function cellsForRoom_(days, bookings, room) {
  var cells = []
  var index = 0
  while (index < days.length) {
    var day = days[index]
    if (!day.inPeriod) {
      cells.push({ kind: 'outside' })
      index += 1
      continue
    }
    var booking = null
    for (var cursor = 0; cursor < bookings.length; cursor += 1) {
      var item = bookings[cursor]
      if (item.room === room && day.iso >= item.checkIn && day.iso < item.checkOut) {
        booking = item
        break
      }
    }
    if (!booking) {
      cells.push({ kind: 'empty' })
      index += 1
      continue
    }
    var span = 1
    while (index + span < days.length) {
      var next = days[index + span]
      if (!next.inPeriod || next.iso < booking.checkIn || next.iso >= booking.checkOut) break
      span += 1
    }
    cells.push({ kind: 'stay', span: span, booking: booking })
    index += span
  }
  return cells
}

function parsePeriodName_(name) {
  var sheetName = String(name || '').trim()
  var match = sheetName.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})-(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
  if (!match) return null
  var start = partsToIso_(match[1], match[2], match[3])
  var end = partsToIso_(match[4], match[5], match[6])
  if (!start || !end || start > end) return null
  return { sheetName: sheetName, start: start, end: end }
}

function partsToIso_(day, month, year) {
  var iso = Number(year) + '-' + pad2_(month) + '-' + pad2_(day)
  return isRealIso_(iso) ? iso : null
}

function isRealIso_(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  var parts = iso.split('-')
  var year = Number(parts[0])
  var month = Number(parts[1])
  var day = Number(parts[2])
  var date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function isWithin_(iso, period) {
  return isRealIso_(iso) && iso >= period.start && iso <= period.end
}

function nightsBetween_(checkIn, checkOut) {
  return Math.round((parseIso_(checkOut).getTime() - parseIso_(checkIn).getTime()) / 86400000)
}

function parseIso_(iso) {
  var parts = iso.split('-')
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
}

function isoOf_(date) {
  return date.getFullYear() + '-' + pad2_(date.getMonth() + 1) + '-' + pad2_(date.getDate())
}

function startOfMonday_(iso) {
  var date = parseIso_(iso)
  var day = date.getDay()
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
  return date
}

function asIso_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd')
  }
  var text = String(value || '').trim()
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : ''
}

function asInt_(value, message, min) {
  var number = Number(value)
  if (!isFinite(number) || Math.floor(number) !== number || number < min) throw new Error(message)
  return number
}

function safeText_(value) {
  var text = String(value || '')
  return text.charAt(0) === '=' ? "'" + text : text
}

function hasId_(rows, id) {
  return rows.some(function (row) {
    return row.id === id
  })
}

function compareBookings_(a, b) {
  if (a.checkIn !== b.checkIn) return a.checkIn < b.checkIn ? -1 : 1
  return String(a.guestName).localeCompare(String(b.guestName))
}

function pad2_(value) {
  var text = String(Number(value))
  return text.length < 2 ? '0' + text : text
}
