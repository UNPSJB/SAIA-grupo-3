from fastapi import APIRouter, Depends
from src.auth.dependencies import tiene_permiso_administrar

class PermissionedRouter(APIRouter):

    def get(self, path, *, dependencies=None, **kwargs):
        dependencies = dependencies if dependencies is not None else [Depends(tiene_permiso_administrar)]
        return super().get(path, dependencies=dependencies, **kwargs)

    def post(self, path, *, dependencies=None, **kwargs):
        dependencies = dependencies if dependencies is not None else [Depends(tiene_permiso_administrar)]
        return super().post(path, dependencies=dependencies, **kwargs)

    def put(self, path, *, dependencies=None, **kwargs):
        dependencies = dependencies if dependencies is not None else [Depends(tiene_permiso_administrar)]
        return super().put(path, dependencies=dependencies, **kwargs)

    def patch(self, path, *, dependencies=None, **kwargs):
        dependencies = dependencies if dependencies is not None else [Depends(tiene_permiso_administrar)]
        return super().patch(path, dependencies=dependencies, **kwargs)

    def delete(self, path, *, dependencies=None, **kwargs):
        dependencies = dependencies if dependencies is not None else [Depends(tiene_permiso_administrar)]
        return super().delete(path, dependencies=dependencies, **kwargs)