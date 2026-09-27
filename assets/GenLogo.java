import java.awt.*;
import java.awt.geom.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.List;
import javax.imageio.ImageIO;

// Draws the DisputeCopilot mark (rounded square + checkmark) at any size, matching assets/logo.svg,
// and writes PNGs plus a multi-size .ico. Run once at asset-authoring time, not part of the app build.
public class GenLogo {
  static BufferedImage draw(int size) {
    BufferedImage img = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
    Graphics2D g = img.createGraphics();
    g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
    double s = size / 64.0;
    g.setColor(new Color(0x3a, 0x6c, 0xb0));
    g.fill(new RoundRectangle2D.Double(0, 0, size, size, 14 * s, 14 * s));
    g.setStroke(new BasicStroke((float) (4.5 * s), BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
    g.setColor(Color.WHITE);
    Path2D check = new Path2D.Double();
    check.moveTo(22.5 * s, 33.5 * s);
    check.lineTo(29 * s, 40 * s);
    check.lineTo(42 * s, 26 * s);
    g.draw(check);
    g.dispose();
    return img;
  }

  static void writeIco(File out, List<BufferedImage> images) throws IOException {
    ByteArrayOutputStream[] pngs = new ByteArrayOutputStream[images.size()];
    for (int i = 0; i < images.size(); i++) {
      pngs[i] = new ByteArrayOutputStream();
      ImageIO.write(images.get(i), "png", pngs[i]);
    }
    int headerSize = 6 + 16 * images.size();
    int offset = headerSize;
    ByteBuffer buf = ByteBuffer.allocate(headerSize + pngs[0].size() * 0 + sum(pngs)).order(ByteOrder.LITTLE_ENDIAN);
    buf.putShort((short) 0);
    buf.putShort((short) 1);
    buf.putShort((short) images.size());
    for (int i = 0; i < images.size(); i++) {
      int dim = images.get(i).getWidth();
      buf.put((byte) (dim >= 256 ? 0 : dim));
      buf.put((byte) (dim >= 256 ? 0 : dim));
      buf.put((byte) 0);
      buf.put((byte) 0);
      buf.putShort((short) 1);
      buf.putShort((short) 32);
      buf.putInt(pngs[i].size());
      buf.putInt(offset);
      offset += pngs[i].size();
    }
    for (ByteArrayOutputStream png : pngs) buf.put(png.toByteArray());
    try (FileOutputStream fos = new FileOutputStream(out)) {
      fos.write(buf.array());
    }
  }

  static int sum(ByteArrayOutputStream[] arr) {
    int t = 0;
    for (ByteArrayOutputStream a : arr) t += a.size();
    return t;
  }

  public static void main(String[] args) throws Exception {
    File dir = new File("D:/DisputeCopilot/assets");
    int[] sizes = {16, 32, 48, 64, 128, 256};
    List<BufferedImage> images = new java.util.ArrayList<>();
    for (int size : sizes) {
      BufferedImage img = draw(size);
      images.add(img);
      ImageIO.write(img, "png", new File(dir, "logo-" + size + ".png"));
    }
    writeIco(new File(dir, "icon.ico"), images);
    System.out.println("Wrote PNGs and icon.ico to " + dir);
  }
}
