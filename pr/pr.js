/**
 * Initializes the payment request object.
 * @param {string} amount - The payment amount
 * @return {PaymentRequest} The payment request object.
 */
function buildPaymentRequest(amount = '0.01') {
  if (!window.PaymentRequest) {
    error('Payment Request API is not supported or not enabled.');
    return null;
  }

  const returnValue = document.getElementById('returnValue').value;
  const supportedInstruments = [{
    supportedMethods: 'https://bobbucks.dev/pay',
    data: {
      testField: 'test value',
      returnValue,
    },
  }];

  const details = {
    total: {
      label: 'Total',
      amount: {
        currency: 'USD',
        value: amount,
      },
    },
  };

  let request = null;

  try {
    request = new PaymentRequest(supportedInstruments, details);
    if (request.canMakePayment) {
      request.canMakePayment().then(function(result) {
        info(result ? 'Can make payment' : 'Cannot make payment');
      }).catch(function(err) {
        info(err.toString());
      });
    }
    if (request.hasEnrolledInstrument) {
      request.hasEnrolledInstrument().then(function(result) {
        info(result ? 'Has enrolled instrument' : 'No enrolled instrument');
      }).catch(function(err) {
        info(err.toString());
      });
    }
  } catch (e) {
    error('Developer mistake: \'' + e.message + '\'');
  }

  request.addEventListener('paymentmethodchange', e => {
    info('"paymentmethodchange" called on request with method name ' + e.methodName);
    info('Responding with an error, for testing');
    e.updateWith({error: 'Error for testing'});
  });

  return request;
}

let request = buildPaymentRequest();

/**
 * Handles the response from PaymentRequest.show().
 * @param {string} amount - The payment amount
 */
function handlePaymentResponse(response, amount = '0.01') {
    response.complete('success')
      .then(function() {
        dismissPageDimmer();
        info(JSON.stringify(response, undefined, 2));
        request = buildPaymentRequest(amount);
      })
      .catch(function(err) {
        dismissPageDimmer();
        error(err);
        request = buildPaymentRequest(amount);
      });
}

/**
 * Launches payment request for Bob Pay.
 * @param {string} amount - The payment amount
 */
function onBuyClicked(amount = '0.01') { // eslint-disable-line no-unused-vars
  if (!window.PaymentRequest || !request) {
    error('Payment Request API is not supported or not enabled.');
    return;
  }

  // Rebuild request with the specified amount
  request = buildPaymentRequest(amount);

  try {
    showPageDimmer();
    request.show()
      .then(response => handlePaymentResponse(response, amount))
      .catch(function(err) {
        error(err);
        request = buildPaymentRequest(amount);
      });
  } catch (e) {
    error('Developer mistake: \'' + e.message + '\'');
    request = buildPaymentRequest(amount);
  }
}

function onReturnValueChanged() {
  // Get current amount from URL or use default
  const urlParams = new URLSearchParams(window.location.search);
  const amount = urlParams.get('amount') || '0.01';
  request = buildPaymentRequest(amount);
}