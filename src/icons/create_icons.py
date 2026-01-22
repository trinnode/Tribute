from PIL import Image, ImageDraw
import os

def create_icon(size):
    # Create image with transparency
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw gradient circle (simplified as solid color)
    circle_color = (102, 126, 234, 255)  # #667eea
    margin = size // 10
    draw.ellipse([margin, margin, size-margin, size-margin], fill=circle_color)
    
    # Draw star shape (simplified)
    center = size // 2
    star_size = size // 3
    star_color = (255, 255, 255, 230)
    
    # Simple star approximation using polygon
    points = []
    for i in range(10):
        angle = i * 36 * 3.14159 / 180
        if i % 2 == 0:
            r = star_size
        else:
            r = star_size // 2
        x = center + r * __import__('math').cos(angle)
        y = center + r * __import__('math').sin(angle)
        points.append((x, y))
    
    draw.polygon(points, fill=star_color)
    
    # Draw center circle
    inner_size = size // 8
    draw.ellipse([center-inner_size, center-inner_size, center+inner_size, center+inner_size], 
                 fill=star_color)
    
    return img

# Create icons
for size, filename in [(16, 'icon16.png'), (48, 'icon48.png'), (128, 'icon128.png')]:
    img = create_icon(size)
    img.save(filename)
    print(f"Created {filename}")
