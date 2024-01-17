import { Error, Image, ImageContainer, Info, Success, Warning } from '../../../AppStyles';
import { ValidationResults } from '../../../types';
import { Utils } from 'microstore-3d/lib/Utils';

export default function ValidationContent({
  validationResults,
}: {
  validationResults: ValidationResults;
}) {
  return (
    <>
      <BoundariesSection validationResults={validationResults} />
      <ChangeableGroupSection validationResults={validationResults} />
      <TechPacksSection validationResults={validationResults} />
      <MaterialMatchesSection validationResults={validationResults} />
      <RelationshipErrorsSection validationResults={validationResults} />
      <ScreenshotsSection validationResults={validationResults} />
      <TechPackImagesSection validationResults={validationResults} />
    </>
  );
}

function BoundariesSection({ validationResults }: { validationResults: ValidationResults }) {
  return (
    <>
      <h4>Boundaries</h4>
      <Info>{`Please follow convention of '..boundary_<display_name>' make sure what being shown in the system makes sense (e.g. Front, Back, Left Sleeve, etc..).`}</Info>
      {validationResults.boundaries.length === 0 ? (
        <Warning>
          Could not find any boundary! Please make sure that the model doesn't have any
        </Warning>
      ) : null}
      <ol>
        {validationResults.boundaries.map((item, index) => (
          <li key={item + index}>{computeBoundaryResult(item)}</li>
        ))}
      </ol>
    </>
  );
}

function ChangeableGroupSection({ validationResults }: { validationResults: ValidationResults }) {
  return (
    <>
      <h4>Changeable Group (Layers)</h4>
      <Info>{`Please follow convention of '..changeable_group_<number>_<display_name>' such as 'CropT_changeable_group_1_left_sleeve'`}</Info>
      {validationResults.layers.length === 0 ? (
        <Warning>
          Could not find any changeable group! Please make sure that the model doesn't have any
        </Warning>
      ) : null}
      <ol>
        {validationResults.layers.map((item, index) => (
          <li key={item + index}>{computeLayerResult(item)}</li>
        ))}
      </ol>
    </>
  );
}

function TechPacksSection({ validationResults }: { validationResults: ValidationResults }) {
  return (
    <>
      <h4>Tech Packs (Flat layers)</h4>
      <ol>
        {validationResults.layers.map((item, index) => (
          <li key={item + index}>
            {validationResults.techPacks.includes(`${item}_flat`) ? (
              <Success>
                {item} has a matching flat version {item}_flat
              </Success>
            ) : (
              <Error>Could not find flat version of {item}</Error>
            )}
          </li>
        ))}
        {validationResults.boundaries.map((item, index) => (
          <li key={item + index}>
            {validationResults.techPacks.includes(`${item}_flat`) ? (
              <Success>
                {item} has a matching flat version {item}_flat
              </Success>
            ) : (
              <Error>Could not find flat version of {item}</Error>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

function MaterialMatchesSection({ validationResults }: { validationResults: ValidationResults }) {
  return (
    <>
      <h4>Material Matches</h4>
      <ol>
        {validationResults.materialMatches.map((item) => (
          <li key={item.boundaryName}>
            {item.result ? (
              <Success>
                {item.boundaryName} is using the same material as {item.boundaryName}_flat
              </Success>
            ) : (
              <Error>
                {item.boundaryName} is not using the same material as {item.boundaryName}_flat
              </Error>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

function RelationshipErrorsSection({
  validationResults,
}: {
  validationResults: ValidationResults;
}) {
  return (
    <>
      <h4>Relationship Errors</h4>
      <ol>
        {validationResults.materialErrors.map((meshes, index) => (
          <li key={'meshes' + index}>
            <Error>These are sharing the same material: {meshes.join(', ')}</Error>
          </li>
        ))}
      </ol>
    </>
  );
}

function ScreenshotsSection({ validationResults }: { validationResults: ValidationResults }) {
  return (
    <>
      <h4>Screenshots</h4>
      <Info>Please make sure all layers have colors other than light gray</Info>
      <ImageContainer>
        {validationResults.screenshots.map((item, index) => (
          <Image src={item} key={'screenshot' + index} />
        ))}
      </ImageContainer>
    </>
  );
}

function TechPackImagesSection({ validationResults }: { validationResults: ValidationResults }) {
  return (
    <>
      <h4>Tech Pack Images</h4>
      <Info>
        Please make sure logos are on tech pack images that have boundaries and all images are clear
        and not cut off.
      </Info>
      <ImageContainer>
        {validationResults.techpackImages.map((item, index) => (
          <Image src={item.image} key={'techpack' + index} />
        ))}
      </ImageContainer>
    </>
  );
}

const computeBoundaryResult = (name: string) => {
  const res = Utils.getDisplayNameIfBoundary(name);
  if (!res) {
    return <Error>{`${name} -> Error. Check naming convention`}</Error>;
  }
  return <Success>{`${name} -> '${res}' in system`}</Success>;
};

const computeLayerResult = (name: string) => {
  const res = Utils.getDisplayNameIfChangeableGroup(name);
  if (!res) {
    return <Error>{`${name} -> Error. Check naming convention`}</Error>;
  }
  return <Success>{`${name} -> '${res.displayName}' in system`}</Success>;
};
