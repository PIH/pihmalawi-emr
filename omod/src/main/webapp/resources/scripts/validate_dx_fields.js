var validateDxDate = function () {
  var validationResult = true;
  jq(".dx-selected input[type='checkbox']").each(function (index) {
    var isDxChecked = this.checked;
    var tdParent = jq(this).parent().parent();
    var dateFieldId = tdParent.data("toggle-target");
    var dxDateSpan = jq("#" + dateFieldId);
    var dateValue = getField(dateFieldId + ".value").val();

    if (dxDateSpan) {
      if (isDxChecked) {
        // make dxDate field required
        if (dateValue) {
          validationResult = true;
          flowsheet.toggleError(getField( dateFieldId + '.value'), null);
        } else {
          flowsheet.toggleError(getField( dateFieldId + '.value'), "Required");
          validationResult = false;
          return validationResult;
        }
      } else {
        validationResult = true;
        flowsheet.toggleError(getField( dateFieldId + '.value'), null);
      }
    } else {
      validationResult = false;
    }
  });
  return validationResult;
}

function updateDxDate() {

  jq(".dx-date-required input[type='text']").change(function () {
    var parentDateId = jq(this).parent().attr('id');
    var dateValue = jq(this).val();

    if (dateValue) {
      flowsheet.toggleError(getField( parentDateId + '.value'), null);
    }
  });

}

function requireDxDate() {
  jq(".dx-selected input[type='checkbox']").change( function() {
    var isDxChecked = this.checked;
    var tdParent = jq(this).parent().parent();
    var dateFieldId = tdParent.data("toggle-target");
    var dxDateSpan = jq("#" + dateFieldId);

    if ( dxDateSpan ) {
      if ( isDxChecked && !getField(dateFieldId + ".value").val() ) {
        // make dxDate field required
        flowsheet.toggleError(getField( dateFieldId + '.value'), "Required");
      } else {
        // remove the required requirement for the dxDate field
        flowsheet.toggleError(getField( dateFieldId + '.value'), null);
      }
    }
  });
}

// For forms whose diagnosis is fixed (hidden, always checked), so its date is
// required from the start: flags the date on load, clears it once filled, and
// returns a beforeValidation check.
function requireFixedDxDate(dateFieldId) {
  var checkDxDate = function () {
    // once the header is saved the flowsheet's other forms reuse this page,
    // so don't block them when the date field is no longer being edited
    if (!jq("#" + dateFieldId + " input").length) {
      return true;
    }
    var dateValue = getField(dateFieldId + ".value").val();
    flowsheet.toggleError(getField(dateFieldId + ".value"), dateValue ? null : "Required");
    return !!dateValue;
  };
  // deferred: the form's fields (getField) and datepickers aren't set up yet
  // when this runs during page load
  setTimeout(checkDxDate, 0);
  jq("#" + dateFieldId + " input").change(checkDxDate);
  return checkDxDate;
}
