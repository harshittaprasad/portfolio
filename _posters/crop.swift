// Crops the top-left W x H pixels of a PNG and saves it as a JPEG.
// swift crop.swift in.png out.jpg W H quality(0-1)
import Foundation
import AppKit
let a = CommandLine.arguments
guard a.count == 6, let img = NSImage(contentsOfFile: a[1]),
      let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { print("usage: crop in.png out.jpg W H q"); exit(1) }
let w = Int(a[3])!, h = Int(a[4])!, q = Double(a[5])!
guard let part = cg.cropping(to: CGRect(x: 0, y: 0, width: w, height: h)) else { print("crop failed"); exit(1) }
let rep = NSBitmapImageRep(cgImage: part)
let data = rep.representation(using: .jpeg, properties: [.compressionFactor: q])!
try! data.write(to: URL(fileURLWithPath: a[2]))
