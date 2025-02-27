const {generateFullEntityName, getContainerName, getDifferentItems} = require("../../../utils/general");

const hydrateDropIndexes = (_) => entity => {
    const bloomIndex = _.get(entity, 'BloomIndxs', []);
    return bloomIndex.length ? generateFullEntityName(entity) : '';
};

const hydrateAddIndexes = (_) => (entity, BloomIndxs, properties, definitions) => {
    const compMod = _.get(entity, 'role.compMod', {});
    const entityData = _.get(entity, 'role', {});
    const containerData = {name: getContainerName(compMod)};
    return [[containerData], [entityData, {}, {BloomIndxs}], {...entityData, properties}, definitions];
};

const hydrateIndex = (_) => (entity, properties, definitions) => {
    const bloomIndex = _.get(entity, 'role.compMod.BloomIndxs', {});
    const {drop, add} = getDifferentItems(_)(bloomIndex.new, bloomIndex.old);
    return {
        hydratedDropIndex: hydrateDropIndexes(_)({...entity, BloomIndxs: drop}),
        hydratedAddIndex: hydrateAddIndexes(_)(entity, add, properties, definitions),
    };
}

module.exports = {
    hydrateDropIndexes,
    hydrateAddIndexes,
    hydrateIndex,
}
