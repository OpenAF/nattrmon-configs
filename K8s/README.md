# Kubernetes (K8s) nAttrMon plugs

## Inputs

| Input | Description |
|-------|-------------|
| [nInput_K8SClusterMetrics.js](#ninput_k8sclustermetrics) | With K8S cluster admin permissions retrieves pod container level statistics regarding cpu, memory and storage |

### nInput_K8SClusterMetrics

#### Example:

```yaml
input:
  name    : K8S Cluster Metrics
  cron    : "*/30 * * * * *"
  execFrom: nInput_K8SClusterMetrics
  execArgs:
    #ns : namespace-1, namespace-2
    #raw: true
    #includeSA: true
    #includeNode: true
    #includeStats: true
    timeout: 30000
    #attrTemplate: K8S/Cluster Metrics
```

#### Description of arguments:

| Argument | Type | Description |
|----------|------|-------------|
| ns | String | A comma delimited list of namespaces. |
| raw | Boolean | Boolean flag to parse requests and limits. |
| includeSA | Boolean | Boolean flag to include the corresponding service account. |
| includeNode | Boolean | Boolean flag to include the corresponding node. |
| includeStats | Boolean | Boolean flag to include extra stats. |
| timeout | Boolean | imeout (in ms) on the stats collected from each node (should be equal or less that the frequency of the input gathering) |
| attrTemplate | String | The attribute name template |

#### Necessary permissions:

At the Kubernetes level it's necessary to have permissions similar to the following at the cluster level:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: nattrmon
  namespace: my-namespace
rules:
- apiGroups:
  - ""
  - metrics.k8s.io
  resources:
  - pods
  - deployments
  - services
  - namespaces
  - nodes/proxy
  - nodes
  verbs:
  - get
  - list
- apiGroups:
  - ""
  resources:
  - pods/exec
  - pods/attach
  verbs:
  - create
  - get

---

apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: nattrmon
  namespace: my-namespace
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: nattrmon
subjects:
- kind: ServiceAccount
  name: nattrmon
  namespace: my-namespace
```

### Output example

```yaml
╭ name: K8S/Cluster Metrics 
├ val  ╭ [0] ╭ ns               : default 
│      │     ├ pod              : nginx-69df6657b5-zk788 
│      │     ├ startTime        : 25 seconds ago 
│      │     ├ status           : Running 
│      │     ├ container        : nginx 
│      │     ├ limitCPU         : 1 
│      │     ├ limitMEM         : 256 
│      │     ├ requestCPU       : 0.1 
│      │     ├ requestMEM       : 128 
│      │     ├ svcAccount       : default 
│      │     ├ node             : k3d-newcluster-server-0 
│      │     ├ usageNanoCores   : 1262542 
│      │     ├ usageCoreNanoSecs: 29646000 
│      │     ├ memory            ╭ availableBytes : 252899328 
│      │     │                   ├ usageBytes     : 3796992 
│      │     │                   ├ workingSetBytes: 3100672 
│      │     │                   ├ rssBytes       : 2490368 
│      │     │                   ├ pageFaults     : 3383 
│      │     │                   ╰ majorPageFaults: 0 
│      │     ├ storage           ╭ rootfs    ╭ availableBytes: 19171184640 
│      │     │                   │           ├ capacityBytes : 33636024320 
│      │     │                   │           ├ usedBytes     : 94208 
│      │     │                   │           ├ inodesFree    : 1792714 
│      │     │                   │           ├ inodes        : 2097152 
│      │     │                   │           ╰ inodesUsed    : 19 
│      │     │                   ├ logs      ╭ availableBytes: 19171184640 
│      │     │                   │           ├ capacityBytes : 33636024320 
│      │     │                   │           ├ usedBytes     : 4096 
│      │     │                   │           ├ inodesFree    : 1792714 
│      │     │                   │           ├ inodes        : 2097152 
│      │     │                   │           ╰ inodesUsed    : 1 
│      │     │                   ╰ ephemeral ╭ availableBytes: 19171184640 
│      │     │                               ├ capacityBytes : 33636024320 
│      │     │                               ├ usedBytes     : 102400 
│      │     │                               ├ inodesFree    : 1792714 
│      │     │                               ├ inodes        : 2097152 
│      │     │                               ╰ inodesUsed    : 21 
│      │     ╰ network           ╭ rxBytes : 946 
│      │                         ├ rxErrors: 0 
│      │                         ├ txBytes : 542 
│      │                         ╰ txErrors: 0 
...
╰ date: 2025-02-27 12:34:56.789 
```