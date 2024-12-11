import time
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver import ActionChains
from selenium.webdriver.support.ui import Select

app = Flask(__name__)
cors = CORS(app, resources={r"/foo": {"origins": "*"}})
app.config['CORS_HEADERS'] = 'Content-Type'

# Selenium setup
def setup_driver():
    """Set up Selenium WebDriver and configure browser for Calligrapher.ai."""
    calli_url = "https://www.calligrapher.ai"
    
    # Configure Chrome WebDriver
    chrome_options = webdriver.ChromeOptions()
    driver = webdriver.Chrome(options=chrome_options)
    driver.maximize_window()
    driver.get(calli_url)
    
    # Adjust settings sliders
    configure_calligrapher(driver)
    
    return driver

def configure_calligrapher(driver):
    """Adjust sliders and styles on Calligrapher.ai."""
    speed_slider = WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.ID, 'speed-slider')))
    ActionChains(driver).drag_and_drop_by_offset(speed_slider, 40, 0).perform()
    
    bias_slider = WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.ID, 'bias-slider')))
    ActionChains(driver).drag_and_drop_by_offset(bias_slider, 20, 0).perform()
    
    width_slider = WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.ID, 'width-slider')))
    ActionChains(driver).drag_and_drop_by_offset(width_slider, 20, 0).perform()
    
    select = Select(driver.find_element(By.ID, 'select-style'))
    select.select_by_visible_text('9')

def get_bounding_box(driver):
    """Calculate the bounding box for the SVG elements."""
    try:
        # Use JavaScript to get the bounding box of the SVG content
        bounding_box = driver.execute_script("""
            let svg = document.getElementById('canvas');
            if (svg) {
                let bbox = svg.getBBox();
                return {
                    x: bbox.x,
                    y: bbox.y,
                    width: bbox.width,
                    height: bbox.height
                };
            }
            return null;
        """)
        return bounding_box
    except Exception as e:
        print(f"Error calculating bounding box: {e}")
        return None

def adjust_viewbox(bounding_box):
    """Create a viewBox slightly larger than the SVG content."""
    if bounding_box:
        try:
            x = bounding_box['x']
            y = bounding_box['y']
            width = bounding_box['width']
            height = bounding_box['height']
            margin = 10  # Add a margin of 10 units around the SVG
            return f"{x - margin} {y - margin} {width + 2 * margin} {height + 2 * margin}"
        except KeyError as e:
            print(f"Missing bounding box value: {e}")
    # Default viewBox if no bounding box is available
    return "0 0 100 100"

def extract_svg_from_canvas(driver):
    """Extract SVG content from the canvas element and create a proper viewBox."""
    try:
        # Wait for the download button to be present, indicating SVG is ready
        WebDriverWait(driver, 20).until(
            EC.element_to_be_clickable((By.ID, 'save-button'))
        )
        

        canvas_svg = driver.find_element(By.ID, 'canvas')
        bounding_box = get_bounding_box(driver)
        adjusted_viewbox = adjust_viewbox(bounding_box)
        svg_content = canvas_svg.get_attribute('outerHTML')
        if 'xmlns=' not in svg_content:
            svg_content = svg_content.replace(
                '<svg ', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{adjusted_viewbox}" '
            )
        else:
            svg_content = svg_content.replace(
                '<svg ', f'<svg id="canvas" viewBox="{adjusted_viewbox}" '
            )

        return svg_content
    
    except Exception as e:
        print(f"Error extracting SVG from canvas: {e}")
        return None

def generate_svg(driver, text):
    """Generate SVG for a given text and extract its content."""
    try:
        # Clear and input text
        text_input = WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.ID, 'text-input')))
        text_input.clear()
        text_input.send_keys(text)
        
        # Click draw button
        draw_button = WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.ID, 'draw-button')))
        draw_button.click()
        
        # Wait and extract SVG
        time.sleep(5)  # Allow time for SVG generation
        svg_content = extract_svg_from_canvas(driver)
        
        return svg_content
    except Exception as e:
        print(f"Error generating SVG for text '{text}': {e}")
        return None

@app.route('/foo', methods=['POST'])
@cross_origin(origin='*', headers=['Content-Type', 'Authorization'])
def foo():
    if request.method == 'POST':
        data = request.json
        text = data.get('text', '')
        
        # Start Selenium and generate SVG
        driver = setup_driver()
        svg_content = generate_svg(driver, text)
        driver.quit()
        
        if svg_content:
            return jsonify({'svg': svg_content})
        else:
            return jsonify({'message': 'Error generating SVG'}), 500

if __name__ == '__main__':
    app.run(debug=True)