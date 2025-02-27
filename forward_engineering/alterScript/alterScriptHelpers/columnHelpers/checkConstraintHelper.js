const { generateFullEntityName, wrapInTicks } = require('../../../utils/general');
const { AlterScriptDto } = require('../../types/AlterScriptDto');

/**
 * @typedef GetAlterScriptDtoFunction
 * @param fullTableName {string}
 * @param collection {Object}
 * @returns Array<AlterScriptDto>
 */

/**
 * @param constraintName {string}
 * @param columnName {string}
 * @return string
 * */
const getCheckConstraintNameForDdlProvider = (constraintName = '', columnName) => {
    const columnNameNoTicks = columnName.replaceAll('`', '');
    const constraintNameNoTicks = constraintName.replaceAll('`', '');
    const appliedConstraintName = constraintNameNoTicks || `${columnNameNoTicks}_constraint`;

    return wrapInTicks(appliedConstraintName);
};

/**
 * @param ddlProvider {Object}
 * @param _ {Object}
 * @returns {GetAlterScriptDtoFunction}
 */
const getAddCheckConstraintsScriptsDtos = (ddlProvider, _) => (fullTableName, collection) => {
    return _.toPairs(collection.properties)
        .filter(([name, jsonSchema]) => {
            const oldName = jsonSchema.compMod.oldField.name;
            const currentCheckConstraintOnColumn = jsonSchema.check;
            const previousCheckConstraintOnColumn = collection.role.properties[oldName]?.check;
            return currentCheckConstraintOnColumn && !previousCheckConstraintOnColumn;
        })
        .map(([columnName, jsonSchema]) => {
            const constraintName = getCheckConstraintNameForDdlProvider(jsonSchema.checkConstraintName, columnName);
            return ddlProvider.setCheckConstraint(fullTableName, constraintName, jsonSchema.check);
        })
        .map(script => AlterScriptDto.getInstance([script], true, false));
};

/**
 * @param ddlProvider {Object}
 * @param _ {Object}
 * @returns {GetAlterScriptDtoFunction}
 */
const getRemoveCheckConstraintsScriptsDtos = (ddlProvider, _) => (fullTableName, collection) => {
    return _.toPairs(collection.properties)
        .filter(([name, jsonSchema]) => {
            const oldName = jsonSchema.compMod.oldField.name;
            const currentCheckConstraintOnColumn = jsonSchema.check;
            const previousCheckConstraintOnColumn = collection.role.properties[oldName]?.check;
            return previousCheckConstraintOnColumn && !currentCheckConstraintOnColumn;
        })
        .map(([name]) => {
            const oldConstraintName = collection.role.properties[name]?.checkConstraintName;
            const constraintName = getCheckConstraintNameForDdlProvider(oldConstraintName, name);
            return ddlProvider.dropCheckConstraint(fullTableName, constraintName);
        })
        .map(script => AlterScriptDto.getInstance([script], true, true));
};

/**
 * @param ddlProvider {Object}
 * @param _ {Object}
 * @returns {GetAlterScriptDtoFunction}
 */
const getModifyCheckConstraintsScriptDtos = (ddlProvider, _) => (fullTableName, collection) => {
    return _.toPairs(collection.properties)
        .filter(([name, jsonSchema]) => {
            const oldName = jsonSchema.compMod.oldField.name;
            const currentCheckConstraintOnColumn = jsonSchema.check;
            const previousCheckConstraintOnColumn = collection.role.properties[oldName]?.check;
            return currentCheckConstraintOnColumn && previousCheckConstraintOnColumn
                && currentCheckConstraintOnColumn !== previousCheckConstraintOnColumn;
        })
        .flatMap(([columnName, jsonSchema]) => {
            const oldColumnName = jsonSchema.compMod.oldField.name;
            const oldConstraintName = collection.role.properties[oldColumnName]?.checkConstraintName;
            const constraintName = getCheckConstraintNameForDdlProvider(oldConstraintName, oldColumnName);
            const dropOldConstraint = ddlProvider.dropCheckConstraint(fullTableName, constraintName);

            const newConstraintName = getCheckConstraintNameForDdlProvider(jsonSchema.checkConstraintName, columnName);
            const createNewConstraint = ddlProvider.setCheckConstraint(fullTableName, newConstraintName, jsonSchema.check);

            return [
                AlterScriptDto.getInstance([dropOldConstraint], true, true),
                AlterScriptDto.getInstance([createNewConstraint], true, false)
            ];
        });
};

/**
 * @return {(collection: Object) => Array<AlterScriptDto>}
 * */
const getCheckConstraintsScriptDtos = (_, ddlProvider) => (collection) => {
    const fullTableName = generateFullEntityName(collection);

    const addCheckConstraintsScriptDtos = getAddCheckConstraintsScriptsDtos(ddlProvider, _)(fullTableName, collection);
    const modifyCheckConstraintsScripts = getModifyCheckConstraintsScriptDtos(ddlProvider, _)(fullTableName, collection);
    const removeCheckConstraintScripts = getRemoveCheckConstraintsScriptsDtos(ddlProvider, _)(fullTableName, collection);

    return [
        ...removeCheckConstraintScripts,
        ...modifyCheckConstraintsScripts,
        ...addCheckConstraintsScriptDtos
    ].filter(Boolean);
};

module.exports = {
    getCheckConstraintsScriptDtos,
};
