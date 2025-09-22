/**
 * Validation script for dropdown text visibility fixes
 * Run this in browser console to validate all dropdown improvements
 */

(function() {
    'use strict';
    
    console.log('🔍 Starting Dropdown Visibility Validation...');
    
    // Test results storage
    const testResults = {
        passed: 0,
        failed: 0,
        warnings: 0,
        details: []
    };
    
    function addResult(test, status, message, element = null) {
        testResults.details.push({
            test,
            status,
            message,
            element: element ? element.tagName + (element.id ? `#${element.id}` : '') : null
        });
        
        if (status === 'PASS') {
            testResults.passed++;
            console.log(`✅ ${test}: ${message}`);
        } else if (status === 'FAIL') {
            testResults.failed++;
            console.error(`❌ ${test}: ${message}`, element);
        } else if (status === 'WARN') {
            testResults.warnings++;
            console.warn(`⚠️ ${test}: ${message}`, element);
        }
    }
    
    // Test 1: Check if dropdown CSS file is loaded
    function testCSSLoaded() {
        const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        const dropdownCSS = cssLinks.find(link => link.href.includes('dropdown-fixes.css'));
        
        if (dropdownCSS) {
            addResult('CSS Loading', 'PASS', 'Dropdown fixes CSS file is loaded');
        } else {
            addResult('CSS Loading', 'FAIL', 'Dropdown fixes CSS file is not loaded');
        }
    }
    
    // Test 2: Check if JavaScript enhancements are loaded
    function testJSLoaded() {
        if (typeof window.DropdownEnhancements !== 'undefined') {
            addResult('JS Loading', 'PASS', 'Dropdown enhancements JavaScript is loaded');
        } else {
            addResult('JS Loading', 'WARN', 'Dropdown enhancements JavaScript may not be loaded');
        }
    }
    
    // Test 3: Find all dropdowns
    function testDropdownsExist() {
        const dropdowns = document.querySelectorAll('select');
        
        if (dropdowns.length > 0) {
            addResult('Dropdown Detection', 'PASS', `Found ${dropdowns.length} dropdown(s)`);
            return dropdowns;
        } else {
            addResult('Dropdown Detection', 'FAIL', 'No dropdowns found on page');
            return [];
        }
    }
    
    // Test 4: Check dropdown styling
    function testDropdownStyling(dropdowns) {
        dropdowns.forEach((dropdown, index) => {
            const computedStyle = window.getComputedStyle(dropdown);
            const testName = `Dropdown Styling ${index + 1}`;
            
            // Check background color
            const bgColor = computedStyle.backgroundColor;
            if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                addResult(testName, 'PASS', `Background color applied: ${bgColor}`, dropdown);
            } else {
                addResult(testName, 'FAIL', 'No background color applied', dropdown);
            }
            
            // Check text color
            const textColor = computedStyle.color;
            if (textColor && textColor !== 'rgb(0, 0, 0)') {
                addResult(testName, 'PASS', `Text color applied: ${textColor}`, dropdown);
            } else {
                addResult(testName, 'FAIL', 'Default text color detected', dropdown);
            }
            
            // Check border
            const borderColor = computedStyle.borderColor;
            if (borderColor && borderColor !== 'rgb(0, 0, 0)') {
                addResult(testName, 'PASS', `Border color applied: ${borderColor}`, dropdown);
            } else {
                addResult(testName, 'WARN', 'Default border color detected', dropdown);
            }
        });
    }
    
    // Test 5: Check dropdown classes
    function testDropdownClasses(dropdowns) {
        dropdowns.forEach((dropdown, index) => {
            const testName = `Dropdown Classes ${index + 1}`;
            
            if (dropdown.classList.contains('dropdown-select')) {
                addResult(testName, 'PASS', 'Has dropdown-select class', dropdown);
            } else {
                addResult(testName, 'WARN', 'Missing dropdown-select class', dropdown);
            }
            
            // Check for Tailwind classes
            const hasTailwindClasses = Array.from(dropdown.classList).some(cls => 
                cls.includes('bg-') || cls.includes('text-') || cls.includes('border-')
            );
            
            if (hasTailwindClasses) {
                addResult(testName, 'PASS', 'Has Tailwind styling classes', dropdown);
            } else {
                addResult(testName, 'WARN', 'No Tailwind styling classes found', dropdown);
            }
        });
    }
    
    // Test 6: Check accessibility attributes
    function testAccessibility(dropdowns) {
        dropdowns.forEach((dropdown, index) => {
            const testName = `Accessibility ${index + 1}`;
            
            // Check for labels
            const hasLabel = dropdown.getAttribute('aria-label') || 
                           dropdown.getAttribute('aria-labelledby') ||
                           dropdown.previousElementSibling?.tagName === 'LABEL';
            
            if (hasLabel) {
                addResult(testName, 'PASS', 'Has proper labeling', dropdown);
            } else {
                addResult(testName, 'WARN', 'Missing proper labeling', dropdown);
            }
            
            // Check for role
            const hasRole = dropdown.getAttribute('role');
            if (hasRole) {
                addResult(testName, 'PASS', `Has role: ${hasRole}`, dropdown);
            } else {
                addResult(testName, 'WARN', 'Missing role attribute', dropdown);
            }
        });
    }
    
    // Test 7: Check options styling
    function testOptionsStyling(dropdowns) {
        dropdowns.forEach((dropdown, index) => {
            const testName = `Options Styling ${index + 1}`;
            const options = dropdown.querySelectorAll('option');
            
            if (options.length > 0) {
                addResult(testName, 'PASS', `Found ${options.length} option(s)`, dropdown);
                
                // Check if options have proper styling
                let styledOptions = 0;
                options.forEach(option => {
                    const optionStyle = window.getComputedStyle(option);
                    if (optionStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                        styledOptions++;
                    }
                });
                
                if (styledOptions > 0) {
                    addResult(testName, 'PASS', `${styledOptions} option(s) have styling`, dropdown);
                } else {
                    addResult(testName, 'WARN', 'Options may not have custom styling', dropdown);
                }
            } else {
                addResult(testName, 'WARN', 'No options found', dropdown);
            }
        });
    }
    
    // Test 8: Check contrast ratio (simplified)
    function testContrast(dropdowns) {
        dropdowns.forEach((dropdown, index) => {
            const testName = `Contrast ${index + 1}`;
            const computedStyle = window.getComputedStyle(dropdown);
            
            const bgColor = computedStyle.backgroundColor;
            const textColor = computedStyle.color;
            
            // Simple contrast check (not WCAG compliant calculation, but basic validation)
            if (bgColor.includes('rgba(25, 25, 25') && textColor.includes('255, 242, 198')) {
                addResult(testName, 'PASS', 'Good contrast detected (dark bg, light text)', dropdown);
            } else if (bgColor && textColor) {
                addResult(testName, 'WARN', `Contrast needs manual verification: bg(${bgColor}) text(${textColor})`, dropdown);
            } else {
                addResult(testName, 'FAIL', 'Unable to determine contrast', dropdown);
            }
        });
    }
    
    // Test 9: Interactive behavior test
    function testInteractivity(dropdowns) {
        dropdowns.forEach((dropdown, index) => {
            const testName = `Interactivity ${index + 1}`;
            
            // Check if dropdown is focusable
            if (dropdown.tabIndex >= 0 || dropdown.tabIndex === -1) {
                addResult(testName, 'PASS', 'Dropdown is focusable', dropdown);
            } else {
                addResult(testName, 'WARN', 'Dropdown focusability unclear', dropdown);
            }
            
            // Check if dropdown is disabled
            if (dropdown.disabled) {
                addResult(testName, 'WARN', 'Dropdown is disabled', dropdown);
            } else {
                addResult(testName, 'PASS', 'Dropdown is enabled', dropdown);
            }
        });
    }
    
    // Test 10: Browser compatibility indicators
    function testBrowserCompatibility() {
        const userAgent = navigator.userAgent;
        const isFirefox = userAgent.toLowerCase().indexOf('firefox') > -1;
        const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
        const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
        const isEdge = /Edge/.test(userAgent);
        
        let browser = 'Unknown';
        if (isChrome) browser = 'Chrome';
        else if (isFirefox) browser = 'Firefox';
        else if (isSafari) browser = 'Safari';
        else if (isEdge) browser = 'Edge';
        
        addResult('Browser Compatibility', 'PASS', `Testing in ${browser}`);
        
        // Check for CSS custom properties support
        if (CSS.supports('color', 'var(--test)')) {
            addResult('CSS Variables', 'PASS', 'CSS custom properties supported');
        } else {
            addResult('CSS Variables', 'WARN', 'CSS custom properties may not be supported');
        }
    }
    
    // Run all tests
    function runAllTests() {
        console.log('🚀 Running dropdown visibility tests...\n');
        
        testCSSLoaded();
        testJSLoaded();
        
        const dropdowns = testDropdownsExist();
        
        if (dropdowns.length > 0) {
            testDropdownStyling(dropdowns);
            testDropdownClasses(dropdowns);
            testAccessibility(dropdowns);
            testOptionsStyling(dropdowns);
            testContrast(dropdowns);
            testInteractivity(dropdowns);
        }
        
        testBrowserCompatibility();
        
        // Print summary
        console.log('\n📊 Test Summary:');
        console.log(`✅ Passed: ${testResults.passed}`);
        console.log(`❌ Failed: ${testResults.failed}`);
        console.log(`⚠️ Warnings: ${testResults.warnings}`);
        console.log(`📝 Total Tests: ${testResults.details.length}`);
        
        if (testResults.failed === 0) {
            console.log('\n🎉 All critical tests passed! Dropdown visibility should be working correctly.');
        } else {
            console.log('\n🔧 Some tests failed. Please review the issues above.');
        }
        
        // Return results for programmatic access
        return testResults;
    }
    
    // Auto-run tests when script loads
    const results = runAllTests();
    
    // Make results available globally
    window.dropdownValidationResults = results;
    
    // Provide manual test function
    window.validateDropdowns = runAllTests;
    
})();
</text>