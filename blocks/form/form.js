import { toCamelCase, toClassName } from '../../scripts/aem.js';

/**
 * Creates an HTML element with an optional class name
 * @param {string} tag - HTML tag name
 * @param {string} [className] - Optional CSS class name
 * @returns {HTMLElement} Created element
 */
function createElement(tag, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

/**
 * Generates a camelCase ID from a name and optional option
 * @param {string} name - Base name for the ID
 * @param {string} [option] - Optional value to append to the ID
 * @returns {string} Generated camelCase ID
 */
function generateId(name, option = null) {
  const id = toCamelCase(name);
  return option ? `${id}-${toCamelCase(option)}` : id;
}

/**
 * Creates a help text paragraph with a unique ID
 * @param {string} text - Help text content
 * @param {string} inputId - ID of the associated input field
 * @returns {HTMLParagraphElement} Help text element
 */
function writeHelpText(text, inputId) {
  const help = createElement('p', 'field-help-text');
  help.textContent = text;
  help.id = `${inputId}-help`;
  return help;
}

/**
 * Creates a label or legend element
 * @param {string} text - Label text content
 * @param {string} [type='label'] - Either 'label' or 'legend'
 * @param {string} [id] - ID of the associated input (for 'label' type only)
 * @param {boolean} [required] - Whether the field is required
 * @returns {HTMLElement} Label or legend element
 */
function buildLabel(text, type = 'label', id = null, required = false) {
  const label = createElement(type);
  label.textContent = text;
  if (id && type === 'label') label.setAttribute('for', id);
  if (required) label.dataset.required = 'true';
  return label;
}

/**
 * Creates an input element with specified attributes
 * @param {Object} field - Field configuration object
 * @returns {HTMLInputElement} Input element
 */
function buildInput(field) {
  const {
    type, field: fieldName, required, default: defaultValue, placeholder,
  } = field;

  const input = createElement('input');
  input.type = type || 'text';
  input.id = generateId(fieldName);
  input.name = input.id;
  input.required = required === 'true';
  if (defaultValue) input.value = defaultValue;
  if (placeholder) input.placeholder = placeholder;
  return input;
}

/**
 * Creates a textarea element
 * @param {Object} field - Field configuration object
 * @returns {HTMLTextAreaElement} Textarea element
 */
function buildTextArea(field) {
  const {
    field: fieldName, required, default: defaultValue, placeholder,
  } = field;

  const textarea = createElement('textarea');
  textarea.id = generateId(fieldName);
  textarea.name = textarea.id;
  textarea.required = required === 'true';
  textarea.rows = 5;
  if (defaultValue) textarea.value = defaultValue;
  if (placeholder) textarea.placeholder = placeholder;
  return textarea;
}

/**
 * Creates a radio/checkbox input for an option
 * @param {Object} field - Field configuration object
 * @param {string} option - Option value
 * @returns {HTMLInputElement} Radio/checkbox input
 */
function buildOptionInput(field, option) {
  const {
    type, field: fieldName, default: defaultValue, required,
  } = field;
  const id = generateId(fieldName, option);

  const input = createElement('input');
  input.type = type;
  input.id = id;
  input.name = generateId(fieldName);
  input.value = option;
  input.checked = option === defaultValue;
  input.required = required === 'true';

  return input;
}

/**
 * Creates a fieldset containing radio/checkbox options
 * @param {Object} field - Field configuration object
 * @param {string} controlled - Controlled field name
 * @returns {HTMLFieldSetElement} Fieldset containing options
 */
function buildOptions(field, controlled) {
  const {
    type, options, label, required,
  } = field;
  if (!options) return null;

  const fieldset = createElement('fieldset', `form-field ${type}-field`);
  if (controlled) {
    const controller = controlled.split('-')[0];
    fieldset.dataset.controller = controller;
    fieldset.dataset.condition = controlled;
  }
  fieldset.append(buildLabel(label, 'legend', null, required === 'true'));

  options.split(',').forEach((o) => {
    const option = o.trim();
    const input = buildOptionInput(field, option);
    const span = createElement('span');
    const labelEl = buildLabel(option, 'label', input.id);
    labelEl.prepend(input, span);
    fieldset.append(labelEl);
  });

  return fieldset;
}

/**
 * Fetches select options from a remote URL
 * @param {URL} url - URL to fetch options from
 * @returns {Promise<Array<HTMLOptionElement>>} Array of option elements
 */
async function buildOptionsFromUrl(url) {
  const resp = await fetch(url);
  const { data } = await resp.json();
  const options = data.map((o) => {
    const { option, value } = o;
    const optionEl = createElement('option');
    if (option && value) {
      optionEl.value = value;
      optionEl.textContent = option;
    } else if (option && !value) {
      optionEl.value = option;
      optionEl.textContent = option;
    } else if (value && !option) {
      optionEl.value = value;
      optionEl.textContent = value;
    }
    return optionEl;
  });
  return options;
}

/**
 * Creates a select dropdown field
 * @param {Object} field - Field configuration object
 * @param {string} controlled - Controlled field name
 * @returns {HTMLElement} Wrapper div containing select element
 */
function buildSelect(field, controlled) {
  const {
    type, options, field: fieldName, label, required, placeholder,
  } = field;
  if (!options) return null;

  const wrapper = createElement('div', `form-field ${type}-field`);
  if (controlled) {
    const controller = controlled.split('-')[0];
    wrapper.dataset.controller = controller;
    wrapper.dataset.condition = controlled;
  }
  wrapper.append(buildLabel(label, 'label', generateId(fieldName), required === 'true'));

  const select = createElement('select');
  select.id = generateId(fieldName);
  select.name = select.id;
  select.required = required === 'true';
  wrapper.append(select);

  if (placeholder) {
    const placeholderOption = createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    select.append(placeholderOption);
  }

  try {
    const url = new URL(options);
    buildOptionsFromUrl(url).then((os) => {
      select.append(...os);
    });
  } catch (error) {
    options.split(',').forEach((o) => {
      const option = o.trim();
      const optionEl = createElement('option');
      optionEl.value = option;
      optionEl.textContent = option;
      select.append(optionEl);
    });
  }

  return wrapper;
}

/**
 * Creates a toggle switch field (styled checkbox)
 * @param {Object} field - Field configuration object
 * @param {string} controlled - Controlled field name
 * @returns {HTMLElement} Wrapper div containing toggle switch
 */
function buildToggle(field, controlled) {
  const {
    label, required, default: defaultValue,
  } = field;

  const wrapper = createElement('div', 'form-field toggle-field');
  if (controlled) {
    const controller = controlled.split('-')[0];
    wrapper.dataset.controller = controller;
    wrapper.dataset.condition = controlled;
  }

  const input = buildOptionInput({ ...field, type: 'checkbox' }, defaultValue || 'true');
  input.setAttribute('role', 'switch');
  input.setAttribute('aria-checked', input.checked);

  input.addEventListener('change', () => {
    input.setAttribute('aria-checked', input.checked);
  });

  const span = createElement('span');
  const labelEl = buildLabel(label, 'label', input.id, required === 'true');
  labelEl.prepend(input, span);
  wrapper.append(labelEl);

  return wrapper;
}

/**
 * Creates a button element
 * @param {Object} field - Field configuration object
 * @returns {HTMLButtonElement} Button element
 */
function buildButton(field) {
  const { type, label } = field;
  const button = createElement('button');
  button.className = 'button';
  button.type = type;
  button.textContent = label;
  if (type === 'reset') button.classList.add('secondary');
  return button;
}

/**
 * Toggles visibility of conditional fields based on the selected input
 * @param {Event} e - Change event
 * @param {Map} controllerConfig - Map of controller names to controlled fields
 */
function toggleConditional(e, controllerConfig) {
  const { target } = e;
  const controller = target.name;
  // check if this is a controlling input
  if (controllerConfig.has(controller)) {
    const inputs = [...controllerConfig.get(controller)];
    inputs.forEach((i) => {
      const field = i.closest('.form-field');
      const { condition } = field.dataset;
      const conditionMet = condition.includes(toClassName(target.value));
      field.setAttribute('aria-hidden', !conditionMet);

      // toggle required and tabindex based on visibility
      if (conditionMet) {
        if (i.dataset.originalRequired === 'true') {
          i.setAttribute('required', '');
        }
        i.removeAttribute('tabindex');
      } else {
        i.removeAttribute('required');
        i.setAttribute('tabindex', '-1'); // remove from tab order when hidden
      }
    });
  }
}

/**
 * Sets initial visibility of conditional fields based on default values.
 * @param {HTMLFormElement} form - Form element
 * @param {Map} controllerConfig - Map of controller names to controlled fields.
 */
function initConditionals(form, controllerConfig) {
  // for each controller, find its current value and apply conditions
  controllerConfig.forEach((controlledInputs, controller) => {
    // find the controlling input - could be radio/checkbox or select
    let controllerValue = null;
    const checked = form.querySelector(`[name="${controller}"]:checked`);
    const select = form.querySelector(`select[name="${controller}"]`);

    if (checked) {
      controllerValue = checked.value;
    } else if (select) {
      controllerValue = select.value;
    }

    if (controllerValue) {
      // set correct visibility for each controlled field
      controlledInputs.forEach((input) => {
        const field = input.closest('.form-field');
        const { condition } = field.dataset;
        const conditionMet = condition.includes(toClassName(controllerValue));
        field.setAttribute('aria-hidden', !conditionMet);

        // store original required state and toggle based on visibility
        if (input.hasAttribute('required')) {
          // store original required state if not already stored
          if (!input.dataset.originalRequired) {
            input.dataset.originalRequired = 'true';
          }

          if (!conditionMet) {
            input.removeAttribute('required');
          }
        }

        // remove from tab order when hidden
        if (conditionMet) {
          input.removeAttribute('tabindex');
        } else {
          input.setAttribute('tabindex', '-1');
        }
      });
    } else {
      // if no input is checked, hide all controlled fields
      controlledInputs.forEach((input) => {
        const field = input.closest('.form-field');
        field.setAttribute('aria-hidden', true);

        // remove required attribute when hidden
        if (input.hasAttribute('required')) {
          // store original required state if not already stored
          if (!input.dataset.originalRequired) {
            input.dataset.originalRequired = 'true';
          }
          input.removeAttribute('required');
        }

        // remove from tab order when hidden
        input.setAttribute('tabindex', '-1');
      });
    }
  });
}

/**
 * Sets up conditional field visibility and ARIA relationships
 * @param {HTMLFormElement} form - Form element
 */
function enableConditionals(form) {
  // find controlled fields
  const controlled = [...form.querySelectorAll('[data-controller]')];

  // create a map of controller names to controlled fields
  const controllerConfig = new Map();

  controlled.forEach((c) => {
    const input = c.querySelector('input, textarea, select');
    const { controller } = c.dataset;

    // add to controller map
    if (!controllerConfig.has(controller)) controllerConfig.set(controller, []);
    controllerConfig.get(controller).push(input);

    // set up aria relationships
    if (input && input.id) {
      // find the controlling input(s)
      const controllerInputs = form.querySelectorAll(`[name="${controller}"]`);

      // set aria-controls on controlling inputs
      controllerInputs.forEach((controllerInput) => {
        // get existing aria-controls or initialize empty
        const existingControls = controllerInput.getAttribute('aria-controls') || '';
        const controlsArray = existingControls.split(' ').filter((ec) => ec);

        // add this input's id if not already present
        if (!controlsArray.includes(input.id)) {
          controlsArray.push(input.id);
        }

        // update aria-controls attribute
        controllerInput.setAttribute('aria-controls', controlsArray.join(' '));

        // set aria-controlledby on the controlled input
        input.setAttribute('aria-controlledby', controllerInput.id);
      });
    }
  });

  // initialize conditional visibility
  initConditionals(form, controllerConfig);

  // add single event listener for ALL controlling inputs
  form.addEventListener('change', (e) => {
    toggleConditional(e, controllerConfig);
  });
}

/**
 * Enables or disables all form elements
 * @param {HTMLFormElement} form - Form element
 * @param {boolean} [disabled=true] - Whether to disable the form
 */
function toggleForm(form, disabled = true) {
  [...form.elements].forEach((el) => {
    el.disabled = disabled;
  });
}

/**
 * Generates form submission payload from form elements
 * @param {HTMLFormElement} form - Form element
 * @returns {Object} Payload object with form data
 */
function generatePayload(form) {
  const payload = {};
  [...form.elements].forEach((field) => {
    if (field.name && !field.disabled) {
      if (field.type === 'radio') {
        if (field.checked) payload[field.name] = field.value;
      } else if (field.type === 'checkbox') {
        if (field.checked) payload[field.name] = payload[field.name] ? `${payload[field.name]},${field.value}` : field.value;
      } else {
        payload[field.name] = field.value;
      }
    }
  });
  return payload;
}

/**
 * Handles form submission
 * @param {HTMLFormElement} form - Form element to submit
 * @returns {Promise<void>}
 */
async function handleSubmit(form) {
  try {
    const payload = generatePayload(form);
    toggleForm(form);
    const response = await fetch(form.dataset.action, {
      method: 'POST',
      body: JSON.stringify({ data: payload }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      if (form.dataset.confirmation) {
        window.location.href = form.dataset.confirmation;
      }
    } else {
      const error = await response.text();
      throw new Error(error);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  } finally {
    toggleForm(form, false);
  }
}

/**
 * Sets up form submission handler
 * @param {HTMLFormElement} form - Form element
 * @param {string} submit - Submit URL
 * @param {Array<Object>} fields - Array of field configurations
 */
function enableSubmission(form, submit, fields) {
  form.dataset.action = submit;
  const confirmation = fields.find((f) => f.type === 'confirmation');
  if (confirmation) {
    form.dataset.confirmation = confirmation.label || confirmation.default;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const valid = form.reportValidity();
    if (valid) {
      handleSubmit(form);
    } else {
      const firstInvalid = form.querySelector(':invalid:not(fieldset)');
      if (firstInvalid) {
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.setAttribute('aria-invalid', true);
      }
    }
  });

  // clear aria-invalid on field change
  form.addEventListener('input', (e) => {
    if (e.target.hasAttribute('aria-invalid')) {
      if (e.target.validity.valid) {
        e.target.removeAttribute('aria-invalid');
      }
    }
  });
}

/**
 * Creates a form field based on field configuration
 * @param {Object} field - Field configuration object
 * @returns {HTMLElement} Form field element (fieldset, div, or button)
 */
function buildField(field) {
  const {
    type, label, help, field: fieldName, conditional,
  } = field;
  const controlled = conditional || null;

  // submit/reset buttons stand alone
  if (type === 'submit' || type === 'reset') {
    return buildButton(field);
  }

  // radio/checkbox groups get a fieldset
  if (type === 'radio' || type === 'checkbox') {
    const fieldset = buildOptions(field, controlled);
    if (help) {
      const helpText = writeHelpText(help, generateId(fieldName));
      fieldset.append(helpText);
    }
    return fieldset;
  }

  if (type === 'toggle') {
    const toggle = buildToggle(field, controlled);
    if (help) {
      const helpText = writeHelpText(help, generateId(fieldName));
      toggle.append(helpText);
    }
    return toggle;
  }

  if (type === 'select') {
    const select = buildSelect(field, controlled);
    if (help) {
      const helpText = writeHelpText(help, generateId(fieldName));
      select.append(helpText);
    }
    return select;
  }

  // inputs and textareas get a wrapper div
  const wrapper = createElement('div', `form-field ${type}-field`);
  if (controlled) {
    const controller = controlled.split('-')[0];
    wrapper.dataset.controller = controller;
    wrapper.dataset.condition = controlled;
  }
  const inputId = generateId(fieldName);
  wrapper.append(buildLabel(label, 'label', inputId, field.required === 'true'));

  // create help text first to get id
  let helpText;
  if (help) {
    helpText = writeHelpText(help, inputId);
    wrapper.append(helpText);
  }

  const input = type === 'textarea' ? buildTextArea(field) : buildInput(field);

  if (type === 'textarea') {
    wrapper.append(input);
  } else {
    wrapper.insertBefore(input, wrapper.firstChild.nextSibling);
  }

  if (help) input.setAttribute('aria-describedby', helpText.id);

  return wrapper;
}

/**
 * Creates a complete form from field configurations
 * @param {Array<Object>} fields - Array of field configurations
 * @returns {HTMLFormElement} Complete form element
 */
function buildForm(fields, submit) {
  const form = createElement('form');
  form.setAttribute('novalidate', '');

  // group buttons at the end
  const buttons = [];

  fields.forEach((field) => {
    if (field.type === 'submit' || field.type === 'reset') {
      buttons.push(field);
    } else if (field.type !== 'confirmation') {
      form.append(buildField(field));
    }
  });

  // add buttons in a wrapper (if any)
  if (buttons.length) {
    const buttonWrapper = createElement('div', 'button-wrapper');
    buttons.forEach((button) => buttonWrapper.append(buildField(button)));
    form.append(buttonWrapper);
  }

  enableConditionals(form);

  if (submit) enableSubmission(form, submit, fields);

  return form;
}

/**
 * Initializes form block with data from JSON endpoint
 * @param {HTMLElement} block - Form block element
 */
export default function decorate(block) {
  block.style.visibility = 'hidden';
  const [source, submit] = [...block.querySelectorAll('a[href]')].map((a) => a.href);
  if (source) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          try {
            const resp = await fetch(new URL(source, window.location.origin));
            if (!resp.ok) throw new Error(`${resp.status}: ${resp.statusText}`);
            const { data } = await resp.json();
            if (!data) throw new Error(`No form fields at ${source}`);
            const form = buildForm(data, submit);
            block.replaceChildren(form);
            block.removeAttribute('style');
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Could not build form from', source, error);
            block.parentElement.remove();
          }
          observer.disconnect();
        }
      });
    }, { threshold: 0 });

    observer.observe(block);
  } else {
    // eslint-disable-next-line no-console
    console.error('Unable to create form without source');
    block.parentElement.remove();
  }
}
