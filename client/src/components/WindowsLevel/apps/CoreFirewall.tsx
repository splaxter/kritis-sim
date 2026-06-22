import { useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Badge,
  MessageBar,
  MessageBarBody,
  mergeClasses,
} from '@fluentui/react-components';
import { FirewallRuleEntry, FirewallSubnet } from '@kritis/shared';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'min(68vh, 560px)',
    overflowY: 'auto',
  },
  intro: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  shield: { fontSize: '24px' },
  introText: { display: 'flex', flexDirection: 'column' },
  introTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  introSub: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 },
  section: {
    margin: '14px 16px 4px',
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '10px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralBackground2}`,
  },
  rowMain: { display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 },
  labelLine: { display: 'flex', alignItems: 'center', gap: '8px' },
  label: { fontSize: tokens.fontSizeBase300, color: tokens.colorNeutralForeground1 },
  labelHostile: { color: tokens.colorPaletteRedForeground1 },
  target: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    fontFamily: tokens.fontFamilyMonospace,
  },
  managed: { fontSize: tokens.fontSizeBase200, color: tokens.colorPaletteYellowForeground2 },
  control: { display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 },
  status: { fontSize: tokens.fontSizeBase200, fontWeight: tokens.fontWeightSemibold, minWidth: '74px', textAlign: 'right' },
  statusAllow: { color: tokens.colorPaletteGreenForeground1 },
  statusBlock: { color: tokens.colorPaletteRedForeground1 },
  statusIsolated: { color: tokens.colorPaletteRedForeground1 },
  message: { margin: '0 16px 10px' },
});

interface CoreFirewallProps {
  zoneName: string;
  rules: FirewallRuleEntry[];
  subnets: FirewallSubnet[];
  /** Emit an interaction token to the level engine. */
  emit: (interaction: string) => void;
  /** Locks the UI once the level is solved. */
  locked: boolean;
}

/**
 * Core-Firewall console. A list of traffic rules (each toggled allow/block) and
 * a list of network segments (each isolatable). Acting on a rule emits
 * `block:<id>` / `unblock:<id>`; isolating a segment emits `isolate:<id>`.
 * Critical entries (the Leitstand management link, the plant segment that must
 * stay reachable) refuse the destructive action and surface `riskFeedback`
 * instead — mirroring the `critical` guards in Settings/Explorer.
 */
export function CoreFirewall({ zoneName, rules, subnets, emit, locked }: CoreFirewallProps) {
  const styles = useStyles();
  const [ruleRows, setRuleRows] = useState<FirewallRuleEntry[]>(rules);
  const [subnetRows, setSubnetRows] = useState<FirewallSubnet[]>(subnets);
  const [warning, setWarning] = useState<string | null>(null);

  const toggleRule = (id: string) => {
    if (locked) return;
    const rule = ruleRows.find((r) => r.id === id);
    if (!rule) return;

    // A critical link (e.g. the Leitstand management rule) is protected: its
    // security-relevant state must not be toggled in EITHER direction — same
    // "fully protected from the mutating action" contract as locked Settings /
    // critical Explorer entries. (Today's content only seeds critical rules as
    // `allow`; guarding both ways keeps the component honest for future levels.)
    if (rule.critical) {
      setWarning(
        rule.riskFeedback ??
          `Die Regel „${rule.label}" ist betriebskritisch und darf nicht verändert werden.`
      );
      emit(`block-blocked:${rule.id}`);
      return;
    }

    const next = rule.action === 'allow' ? 'block' : 'allow';
    setRuleRows((prev) => prev.map((r) => (r.id === id ? { ...r, action: next } : r)));
    setWarning(null);
    emit(`${next === 'block' ? 'block' : 'unblock'}:${rule.id}`);
  };

  const isolateSubnet = (id: string) => {
    if (locked) return;
    const subnet = subnetRows.find((s) => s.id === id);
    if (!subnet || subnet.isolated) return;

    if (subnet.critical) {
      setWarning(
        subnet.riskFeedback ??
          `„${subnet.label}" muss erreichbar bleiben — eine Isolation nimmt die Anlage vom Netz.`
      );
      emit(`isolate-blocked:${subnet.id}`);
      return;
    }

    setSubnetRows((prev) => prev.map((s) => (s.id === id ? { ...s, isolated: true } : s)));
    setWarning(null);
    emit(`isolate:${subnet.id}`);
  };

  return (
    <div className={styles.root}>
      <div className={styles.intro}>
        <span className={styles.shield} aria-hidden>
          🧱
        </span>
        <span className={styles.introText}>
          <span className={styles.introTitle}>Core-Firewall — {zoneName}</span>
          <span className={styles.introSub}>Verkehrsregeln und Netzsegmente der Leittechnik</span>
        </span>
      </div>

      {warning && (
        <div className={styles.message}>
          <MessageBar intent="error" layout="multiline">
            <MessageBarBody>{warning}</MessageBarBody>
          </MessageBar>
        </div>
      )}

      <div className={styles.section}>Verkehrsregeln</div>
      {ruleRows.map((r) => {
        const blocked = r.action === 'block';
        return (
          <div key={r.id} className={styles.row}>
            <span className={styles.rowMain}>
              <span className={styles.labelLine}>
                <Badge
                  appearance="outline"
                  color={r.direction === 'inbound' ? 'danger' : 'informative'}
                  size="small"
                >
                  {r.direction === 'inbound' ? 'Eingehend' : 'Ausgehend'}
                </Badge>
                <span className={mergeClasses(styles.label, r.hostile && styles.labelHostile)}>
                  {r.label}
                  {r.hostile && <span aria-hidden> ⚠</span>}
                </span>
              </span>
              <span className={styles.target}>{r.target}</span>
              {r.critical && <span className={styles.managed}>🔒 betriebskritisch — geschützt</span>}
            </span>
            <span className={styles.control}>
              <span
                className={mergeClasses(styles.status, blocked ? styles.statusBlock : styles.statusAllow)}
              >
                {blocked ? 'Blockiert' : 'Zugelassen'}
              </span>
              <Button
                size="small"
                appearance={blocked ? 'secondary' : 'primary'}
                disabled={locked}
                aria-label={`${blocked ? 'Freigeben' : 'Blockieren'}: ${r.label}`}
                onClick={() => toggleRule(r.id)}
              >
                {blocked ? 'Freigeben' : 'Blockieren'}
              </Button>
            </span>
          </div>
        );
      })}

      <div className={styles.section}>Netzsegmente</div>
      {subnetRows.map((s) => (
        <div key={s.id} className={styles.row}>
          <span className={styles.rowMain}>
            <span className={styles.label}>{s.label}</span>
            {s.critical && <span className={styles.managed}>🔒 betriebskritisch — geschützt</span>}
          </span>
          <span className={styles.control}>
            {s.isolated && <span className={mergeClasses(styles.status, styles.statusIsolated)}>Isoliert</span>}
            <Button
              size="small"
              appearance="primary"
              disabled={locked || s.isolated}
              aria-label={`Isolieren: ${s.label}`}
              onClick={() => isolateSubnet(s.id)}
            >
              {s.isolated ? 'Isoliert' : 'Isolieren'}
            </Button>
          </span>
        </div>
      ))}
    </div>
  );
}
