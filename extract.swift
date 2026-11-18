// PDF -> JSON {pages, outline, title, author} via macOS PDFKit; also writes a cover PNG.
// Ligature glyphs PDFKit can't map come out as U+0000; makeaudiobooks repairs them.
// usage: swift extract.swift in.pdf out.json cover.png
import AppKit
import PDFKit

let a = CommandLine.arguments
guard let doc = PDFDocument(url: URL(fileURLWithPath: a[1])) else { print("cannot open PDF"); exit(1) }
// page.string sometimes emits runs out of reading order, so rebuild lines from their positions.
func text(_ p: PDFPage) -> String {
    let sels = p.selection(for: p.bounds(for: .mediaBox))?.selectionsByLine() ?? []
    var rows: [(y: CGFloat, items: [(x: CGFloat, s: String)])] = []
    for s in sels {
        let b = s.bounds(for: p), t = s.string ?? ""
        if let i = rows.firstIndex(where: { abs($0.y - b.midY) < max(b.height, 1) * 0.5 }) { rows[i].items.append((b.minX, t)) }
        else { rows.append((b.midY, [(b.minX, t)])) }
    }
    return rows.sorted { $0.y > $1.y }.map { $0.items.sorted { $0.x < $1.x }.map { $0.s }.joined(separator: " ") }.joined(separator: "\n")
}
var pages: [String] = []
for i in 0..<doc.pageCount { pages.append(doc.page(at: i).map(text) ?? "") }

var outline: [[Any]] = []
func walk(_ o: PDFOutline, _ depth: Int) {
    for i in 0..<o.numberOfChildren {
        guard let c = o.child(at: i) else { continue }
        if let p = c.destination?.page { outline.append([c.label ?? "", doc.index(for: p), depth]) }
        walk(c, depth + 1)
    }
}
if let root = doc.outlineRoot { walk(root, 0) }

let attrs = doc.documentAttributes ?? [:]
let info: [String: Any] = ["pages": pages, "outline": outline,
                           "title": attrs[PDFDocumentAttribute.titleAttribute] as? String ?? "",
                           "author": attrs[PDFDocumentAttribute.authorAttribute] as? String ?? ""]
try! JSONSerialization.data(withJSONObject: info).write(to: URL(fileURLWithPath: a[2]))

if let p = doc.page(at: 0) {
    let img = p.thumbnail(of: NSSize(width: 1000, height: 1400), for: .mediaBox)
    if let tiff = img.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
       let png = rep.representation(using: .png, properties: [:]) {
        try? png.write(to: URL(fileURLWithPath: a[3]))
    }
}
