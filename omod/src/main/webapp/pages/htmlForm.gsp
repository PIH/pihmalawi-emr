${ ui.includeFragment(fragmentProvider, fragmentName, [
        patient: patient,
        encounter: encounter,
        definitionUiResource: 'file:configuration/htmlforms/' + formName + '.xml',
        returnUrl: returnUrl
]) }